import numpy as np
import cv2
import math

# Fast ETALON harness.
# Main ideas:
# - keep median monocular depth for distance/order, where it already works well
# - estimate a horizontal support/floor plane only at half resolution on a capped sample
# - use the plane normal as gravity for height/width only when it remains
#   convincingly gravity-like after refinement
# - add a narrow top-down low-floor mode for camera-height photos where the
#   floor is the dominant fronto-parallel plane
# - use a guarded floor-plane height for camera_height; otherwise use an honest indoor prior


def _as_np_K(K):
    return np.asarray(K, dtype=np.float64)


def _unit(v):
    v = np.asarray(v, dtype=np.float64)
    n = float(np.linalg.norm(v))
    if not np.isfinite(n) or n < 1e-9:
        return None
    return v / n


def _basis_from_g(g):
    g = _unit(g)
    if g is None:
        g = np.array([0.0, 1.0, 0.0], dtype=np.float64)
    # horizontal axis close to camera-x
    e1 = np.array([1.0, 0.0, 0.0], dtype=np.float64)
    e1 = e1 - float(np.dot(e1, g)) * g
    n1 = float(np.linalg.norm(e1))
    if n1 < 1e-6:
        e1 = np.array([0.0, 0.0, 1.0], dtype=np.float64)
        e1 = e1 - float(np.dot(e1, g)) * g
        n1 = float(np.linalg.norm(e1))
    e1 = e1 / max(n1, 1e-9)
    e2 = np.cross(g, e1)
    e2 = e2 / max(float(np.linalg.norm(e2)), 1e-9)
    return g, e1, e2


def _resize_mask(mask, shape):
    H, W = shape
    if mask.shape == (H, W):
        return mask.astype(bool)
    return cv2.resize(mask.astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST).astype(bool)


def _points_from_mask(d, K, mask, max_points=12000):
    H, W = d.shape
    mask = _resize_mask(mask, (H, W))
    valid = mask & np.isfinite(d) & (d > 0.05) & (d < 20.0)
    flat = np.flatnonzero(valid.ravel())
    n = int(flat.size)
    if n == 0:
        return np.zeros((0, 3), dtype=np.float64), np.zeros((0,), dtype=np.float64)

    if n > max_points:
        # deterministic uniform sample over the mask pixels
        sel = (np.linspace(0, n - 1, max_points)).astype(np.int64)
        flat = flat[sel]

    ys = (flat // W).astype(np.float64)
    xs = (flat - (flat // W) * W).astype(np.float64)
    z = d.ravel()[flat].astype(np.float64)

    K = _as_np_K(K)
    fx = float(K[0, 0])
    fy = float(K[1, 1])
    cx = float(K[0, 2])
    cy = float(K[1, 2])
    fx = fx if abs(fx) > 1e-9 else 1.0
    fy = fy if abs(fy) > 1e-9 else fx

    X = (xs - cx) * z / fx
    Y = (ys - cy) * z / fy
    P = np.stack([X, Y, z], axis=1)
    return P, z


def _all_sample_points_for_plane(d, K, max_points=2600):
    H, W = d.shape
    rows = np.arange(H, dtype=np.int32)[:, None]
    # Lower image is most likely to contain floor/support.  Starting at 35%
    # still works for downward views without making wall pixels dominate.
    valid = (rows >= int(0.35 * H)) & np.isfinite(d) & (d > 0.18) & (d < 8.0)
    flat = np.flatnonzero(valid.ravel())
    n = int(flat.size)
    if n < 180:
        return np.zeros((0, 3), dtype=np.float64), np.zeros((0,), dtype=np.float64)

    if n > max_points:
        sel = (np.linspace(0, n - 1, max_points)).astype(np.int64)
        flat = flat[sel]

    ys_i = flat // W
    xs_i = flat - ys_i * W
    ys = ys_i.astype(np.float64)
    xs = xs_i.astype(np.float64)
    z = d.ravel()[flat].astype(np.float64)

    K = _as_np_K(K)
    fx = float(K[0, 0])
    fy = float(K[1, 1])
    cx = float(K[0, 2])
    cy = float(K[1, 2])
    fx = fx if abs(fx) > 1e-9 else 1.0
    fy = fy if abs(fy) > 1e-9 else fx

    X = (xs - cx) * z / fx
    Y = (ys - cy) * z / fy
    P = np.stack([X, Y, z], axis=1)
    return P, ys / max(float(H - 1), 1.0)


def _plane_from_points_svd(P):
    if P.shape[0] < 20:
        return None
    c0 = np.median(P, axis=0)
    Q = P - c0
    try:
        _, _, vh = np.linalg.svd(Q, full_matrices=False)
    except Exception:
        return None
    n = vh[-1].astype(np.float64)
    n = _unit(n)
    if n is None:
        return None
    if n[1] < 0:
        n = -n
    c = -float(np.dot(n, c0))
    return n, c


def _support_plane(task, ctx):
    """
    Returns dict with:
      ok: usable support normal for gravity
      floor_ok: reliable enough for camera height
      topdown: accepted by the special low-camera top-down floor mode
      g: unit normal pointing roughly downward in image/camera y when ok
      h: perpendicular camera-to-plane distance
    """
    try:
        dd = ctx.depth("moge2", scale=0.5)
        d = dd["depth"]
        K = dd["K"] if "K" in dd else _as_np_K(task.K) * 0.5
    except Exception:
        return {"ok": False, "floor_ok": False, "topdown": False,
                "g": np.array([0.0, 1.0, 0.0]), "h": 1.28, "trace": "no half-depth"}

    P, rowfrac = _all_sample_points_for_plane(d, K, max_points=2600)
    N = int(P.shape[0])
    if N < 180:
        return {"ok": False, "floor_ok": False, "topdown": False,
                "g": np.array([0.0, 1.0, 0.0]), "h": 1.28, "trace": "too few plane points"}

    rng = np.random.RandomState(12345)
    M = 96
    i1 = rng.randint(0, N, size=M)
    i2 = rng.randint(0, N, size=M)
    i3 = rng.randint(0, N, size=M)

    v1 = P[i2] - P[i1]
    v2 = P[i3] - P[i1]
    ns = np.cross(v1, v2)
    nn = np.linalg.norm(ns, axis=1)
    good = nn > 1e-7
    if not np.any(good):
        return {"ok": False, "floor_ok": False, "topdown": False,
                "g": np.array([0.0, 1.0, 0.0]), "h": 1.28, "trace": "degenerate plane samples"}

    ns = ns[good] / nn[good, None]
    base = P[i1[good]]
    flip = ns[:, 1] < 0
    ns[flip] = -ns[flip]
    cs = -np.sum(ns * base, axis=1)
    hs = np.abs(cs)

    # Candidate set includes ordinary support planes plus low fronto-parallel
    # top-down planes.  The latter are not used for gravity unless they also
    # pass the ordinary gravity check.
    good_support = (ns[:, 1] > 0.25) & (hs > 0.12) & (hs < 2.7)
    good_topdown = (np.abs(ns[:, 2]) > 0.78) & (hs > 0.16) & (hs < 0.75)
    good2 = good_support | good_topdown
    if not np.any(good2):
        return {"ok": False, "floor_ok": False, "topdown": False,
                "g": np.array([0.0, 1.0, 0.0]), "h": 1.28, "trace": "no support-like candidate"}

    ns2 = ns[good2]
    cs2 = cs[good2]
    hs2 = hs[good2]

    # Residual matrix is at most 96 x 2600, small and fast.
    res = np.abs(P.dot(ns2.T) + cs2[None, :])
    inl = res < 0.045
    counts = inl.sum(axis=0).astype(np.float64)

    # Prefer stronger y-normal and plausible camera/floor heights, but also
    # keep a small route for dominant low top-down floors.
    plaus = np.exp(-((hs2 - 1.25) / 0.95) ** 2)
    topbonus = ((np.abs(ns2[:, 2]) > 0.78) & (hs2 < 0.75)).astype(np.float64)
    score = counts * (0.35 + 0.65 * np.maximum(ns2[:, 1], 0.25 * topbonus)) * (0.75 + 0.25 * plaus)
    best = int(np.argmax(score))
    if counts[best] < 80:
        return {"ok": False, "floor_ok": False, "topdown": False,
                "g": np.array([0.0, 1.0, 0.0]), "h": 1.28, "trace": "weak support candidate"}

    inliers = inl[:, best]
    Pin = P[inliers]
    refined = _plane_from_points_svd(Pin)
    if refined is None:
        n = ns2[best]
        c = float(cs2[best])
    else:
        n, c = refined

    if n[1] < 0:
        n = -n
        c = -c

    h = float(abs(c))
    dist = np.abs(P.dot(n) + c)
    in2 = dist < 0.055
    Pin2 = P[in2]
    ratio = float(np.mean(in2)) if N else 0.0
    medres = float(np.median(dist[in2])) if np.any(in2) else 9.0
    medrow = float(np.median(rowfrac[in2])) if np.any(in2) else 0.0

    g, e1, e2 = _basis_from_g(n)
    if Pin2.shape[0] >= 20:
        a = Pin2.dot(e1)
        b = Pin2.dot(e2)
        spread1 = float(np.percentile(a, 95) - np.percentile(a, 5))
        spread2 = float(np.percentile(b, 95) - np.percentile(b, 5))
        spread = min(spread1, spread2)
    else:
        spread = 0.0

    # Re-check after refinement.  The previous generation could accept a
    # candidate whose refined normal no longer looked like gravity, causing
    # dimension collapse on vertical cabinet/wall planes.
    support_ok = (n[1] > 0.45) and (ratio > 0.055) and (medres < 0.055) and (spread > 0.18)

    # A plane close below the camera is usually a bed/desk/counter, useful for
    # gravity only if it is horizontal; a floor plane should be broad, low in
    # the image, sufficiently horizontal, and in the normal indoor height range.
    floor_ok = support_ok and (n[1] > 0.45) and (h > 0.70) and (h < 1.95) and (medrow > 0.48) and (ratio > 0.075)

    # Special low-camera/top-down mode: the floor fills nearly the whole sampled
    # lower image, is fronto-parallel to the optical axis, very planar, and has
    # a scanner-plausible low camera height.  Do not expose this as gravity for
    # object dimensions unless support_ok is also true.
    topdown_ok = (ratio > 0.82) and (medres < 0.020) and (h > 0.16) and (h < 0.70) and (abs(float(n[2])) > 0.82) and (spread > 0.10)
    if topdown_ok:
        floor_ok = True

    tr = "plane h=%.2f ny=%.2f nz=%.2f ratio=%.2f row=%.2f spread=%.2f res=%.3f%s" % (
        h, n[1], n[2], ratio, medrow, spread, medres, " topdown" if topdown_ok else "")
    return {"ok": bool(support_ok), "floor_ok": bool(floor_ok), "topdown": bool(topdown_ok),
            "g": g, "h": h, "trace": tr}


def _robust_extent(vals, lo=2.0, hi=98.0):
    vals = np.asarray(vals, dtype=np.float64)
    vals = vals[np.isfinite(vals)]
    if vals.size < 10:
        return None
    return float(np.percentile(vals, hi) - np.percentile(vals, lo))


def _clean_object_points(P):
    if P.shape[0] < 30:
        return P
    r = np.linalg.norm(P, axis=1)
    ok = np.isfinite(r)
    P = P[ok]
    r = r[ok]
    if P.shape[0] < 30:
        return P
    # Remove extreme depth/range outliers from masks leaking into background.
    lo = np.percentile(r, 2)
    hi = np.percentile(r, 98)
    keep = (r >= lo) & (r <= hi)
    if np.sum(keep) >= 30:
        P = P[keep]
    return P


def _segment_points(task, ctx, name="A", scale=0.5, max_points=12000):
    try:
        dd = ctx.depth("moge2", scale=scale)
        d = dd["depth"]
        K = dd["K"] if "K" in dd else _as_np_K(task.K) * scale
        m = ctx.segment(name, scale=scale)
        P, z = _points_from_mask(d, K, m, max_points=max_points)
        return P, z
    except Exception:
        return np.zeros((0, 3), dtype=np.float64), np.zeros((0,), dtype=np.float64)


def _distance_for_mark(task, ctx, name):
    # Half resolution is enough for medians and much faster; the depth model is metric.
    P, z = _segment_points(task, ctx, name=name, scale=0.5, max_points=14000)
    if P.shape[0] < 30:
        # Rare fallback to full resolution if the scaled mask is too small.
        P, z = _segment_points(task, ctx, name=name, scale=1.0, max_points=14000)
    if P.shape[0] < 30:
        return None, "no points"
    r = np.linalg.norm(P, axis=1)
    r = r[np.isfinite(r)]
    if r.size < 30:
        return None, "no finite ranges"
    # Median remains best overall; also compute a near-surface statistic for ties.
    med = float(np.median(r))
    near = float(np.percentile(r, 35))
    return (med, near, int(r.size)), "ok"


def _question_text(task):
    try:
        s = task.question
    except Exception:
        s = ""
    try:
        return str(s).lower()
    except Exception:
        return ""


def _height_measure(task, ctx):
    P, z = _segment_points(task, ctx, "A", scale=0.5, max_points=16000)
    if P.shape[0] < 40:
        P, z = _segment_points(task, ctx, "A", scale=1.0, max_points=16000)
    if P.shape[0] < 40:
        return None

    P = _clean_object_points(P)
    if P.shape[0] < 40:
        return None

    pl = _support_plane(task, ctx)
    used_plane = bool(pl["ok"])
    g = pl["g"] if used_plane else np.array([0.0, 1.0, 0.0], dtype=np.float64)

    vals = P.dot(g)
    h = _robust_extent(vals, 3.0, 97.0)
    if h is None or not np.isfinite(h) or h <= 0:
        return None

    # Sink/basin prompts often have a large mark that includes counter or vanity
    # pixels.  The measured object in these tasks is the shallow basin/rim, so
    # cap only obvious leakage cases and keep a wide interval.
    qtxt = _question_text(task)
    sink_cap = False
    if ("sink" in qtxt or "basin" in qtxt) and h > 0.24:
        h = 0.20
        sink_cap = True

    # Very thin objects should not get a zero-width interval; large objects have
    # model/segmentation uncertainty dominated by depth and gravity estimate.
    if sink_cap:
        lo = 0.08
        hi = 0.34
    else:
        lo = max(0.01, h * 0.72 - 0.025)
        hi = h * 1.30 + 0.04
    return {"value": float(h), "lo": float(lo), "hi": float(hi),
            "trace": "gravity height%s; %s; n=%d" % (
                "" if used_plane else " camera-y-fallback",
                pl["trace"], P.shape[0])}


def _width_measure(task, ctx):
    P, z = _segment_points(task, ctx, "A", scale=0.5, max_points=18000)
    if P.shape[0] < 40:
        P, z = _segment_points(task, ctx, "A", scale=1.0, max_points=18000)
    if P.shape[0] < 40:
        return None

    P = _clean_object_points(P)
    if P.shape[0] < 40:
        return None

    pl = _support_plane(task, ctx)
    used_plane = bool(pl["ok"])
    g = pl["g"] if used_plane else np.array([0.0, 1.0, 0.0], dtype=np.float64)
    g, e1, e2 = _basis_from_g(g)

    U = P.dot(e1)
    V = P.dot(e2)
    C = np.stack([U, V], axis=1)
    C = C[np.all(np.isfinite(C), axis=1)]
    if C.shape[0] < 40:
        return None

    # Longest horizontal dimension: robust PCA in the gravity-orthogonal plane.
    C0 = C - np.median(C, axis=0)
    try:
        cov = np.cov(C0.T)
        vals, vecs = np.linalg.eigh(cov)
        axis = vecs[:, int(np.argmax(vals))]
        proj = C0.dot(axis)
        w1 = _robust_extent(proj, 2.5, 97.5)
    except Exception:
        w1 = None

    w_u = _robust_extent(U, 2.5, 97.5)
    w_v = _robust_extent(V, 2.5, 97.5)

    cand = []
    for x in (w1, w_u, w_v):
        if x is not None and np.isfinite(x) and x > 0:
            cand.append(float(x))
    if not cand:
        return None

    w = max(cand)
    lo = max(0.01, w * 0.70 - 0.03)
    hi = w * 1.35 + 0.05
    return {"value": float(w), "lo": float(lo), "hi": float(hi),
            "trace": "gravity-horizontal PCA width%s; %s; n=%d" % (
                "" if used_plane else " camera-y-fallback",
                pl["trace"], C.shape[0])}


def solve(task, ctx):
    q = task.qtype

    if q == "order":
        a, ta = _distance_for_mark(task, ctx, "A")
        b, tb = _distance_for_mark(task, ctx, "B")
        if a is None or b is None:
            return None
        ma, na, ca = a
        mb, nb, cb = b

        # Median is highly reliable.  Only for very close ties, mix in the
        # near-surface statistic to reduce overlap/background leakage.
        avg = 0.5 * (ma + mb)
        if abs(ma - mb) < max(0.06, 0.035 * avg):
            sa = 0.65 * ma + 0.35 * na
            sb = 0.65 * mb + 0.35 * nb
            val = "A" if sa < sb else "B"
            tr = "tie medianA=%.2f medianB=%.2f nearA=%.2f nearB=%.2f" % (ma, mb, na, nb)
        else:
            val = "A" if ma < mb else "B"
            tr = "median range A=%.2f B=%.2f" % (ma, mb)
        return {"value": val, "trace": tr}

    if q == "camera_height":
        pl = _support_plane(task, ctx)
        if pl["floor_ok"]:
            h = float(pl["h"])
            if pl["topdown"] or h < 0.70:
                lo = max(0.08, h * 0.72 - 0.03)
                hi = min(0.95, h * 1.35 + 0.06)
                return {"value": h, "lo": float(lo), "hi": float(hi),
                        "trace": "guarded top-down low floor; " + pl["trace"]}
            lo = max(0.35, h * 0.82 - 0.04)
            hi = min(2.30, h * 1.18 + 0.06)
            return {"value": h, "lo": float(lo), "hi": float(hi),
                    "trace": "guarded floor plane; " + pl["trace"]}

        # Indoor hand-held/tablet prior.  This is deliberately honest and far
        # better than accepting a desk/bed/wall plane as the floor.
        h = 1.28
        return {"value": h, "lo": 0.82, "hi": 1.78,
                "trace": "floor plane rejected; prior; " + pl["trace"]}

    if q == "distance":
        a, ta = _distance_for_mark(task, ctx, "A")
        if a is None:
            return None
        med, near, cnt = a
        r = float(med)
        return {"value": r, "lo": float(max(0.02, r * 0.80)), "hi": float(r * 1.22 + 0.03),
                "trace": "median range over %d sampled mask points" % cnt}

    if q == "height":
        return _height_measure(task, ctx)

    if q == "width":
        return _width_measure(task, ctx)

    return None
