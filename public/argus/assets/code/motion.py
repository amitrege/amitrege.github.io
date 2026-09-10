import math
import cv2
import numpy as np
from scipy.optimize import least_squares


def _mask(im, color, tol=42):
    d = im.astype(np.float32)-np.asarray(color, np.float32)
    return np.sum(d*d, axis=-1) < tol*tol


def _line(p):
    if len(p) < 20:
        return None
    z = cv2.fitLine(p.astype(np.float32), cv2.DIST_HUBER, 0, .001, .001).ravel()
    return z[2:].astype(float), z[:2].astype(float)


def _pivot(lines):
    rows, bs = [], []
    for ln in lines:
        if ln is not None:
            p, v = ln
            n = np.array([-v[1], v[0]])
            rows.append(n)
            bs.append(n@p)
    if len(rows) < 2:
        raise ValueError('Insufficient rod-line evidence')
    M, b = np.array(rows), np.array(bs)
    x = np.linalg.lstsq(M, b, rcond=None)[0]
    return least_squares(lambda z: M@z-b, x, loss='soft_l1', f_scale=1.5).x


def _crank_pivot(sets, phases):
    rows, ys = [], []
    for p, a in zip(sets, phases):
        if len(p) >= 20:
            c, s = np.cos(a), np.sin(a)
            rows.extend([[1, 0, c, -s], [0, 1, s, c]])
            ys.extend(np.mean(p, axis=0))
    if len(ys) < 6:
        raise ValueError('Insufficient crank evidence')
    M, y = np.array(rows), np.array(ys)
    x = np.linalg.lstsq(M, y, rcond=None)[0]
    return least_squares(lambda z: M@z-y, x, loss='soft_l1', f_scale=1.5).x[:2]


def _pins(im):
    dark = _mask(im, (51, 64, 74), 36).astype(np.uint8)
    num, labels, stats, centers = cv2.connectedComponentsWithStats(dark, 8)
    pins, outputs = [], []
    H, W = im.shape[:2]
    for i in range(1, num):
        x, y, w, h, area = stats[i]
        if not 5 <= area <= 65 or max(w, h) > 12 or max(w, h) > 1.8*min(w, h):
            continue
        cx, cy = centers[i]
        x0, x1 = max(0, int(cx)-11), min(W, int(cx)+12)
        y0, y1 = max(0, int(cy)-11), min(H, int(cy)+12)
        patch = im[y0:y1, x0:x1]
        yy, xx = np.mgrid[y0:y1, x0:x1]
        r = np.hypot(xx-cx, yy-cy)
        ring = (r > 2.8) & (r < 4.2)
        if not ring.any() or _mask(patch, (241, 241, 232), 38)[ring].mean() < .75:
            continue
        if np.sum(_mask(patch, (108, 73, 115), 35) & (r > 5.5) & (r < 9.5)) >= 12:
            outputs.append([cx, cy])
        elif np.sum(_mask(patch, (188, 197, 203), 38) & (r > 4.7) & (r < 7.8)) >= 10:
            pins.append([cx, cy])
    return np.array(pins, float).reshape(-1, 2), np.array(outputs, float).reshape(-1, 2)


def _endpoint(pins, pivot, points, direction):
    if not len(pins) or not len(points):
        return None
    direction = direction.copy()
    proj = (points-pivot)@direction
    far = np.percentile(proj, 98)
    if far < -np.percentile(proj, 2):
        direction *= -1
        far = -np.percentile(proj, 2)
    along = (pins-pivot)@direction
    across = np.abs((pins-pivot)@np.array([-direction[1], direction[0]]))
    score = 3*across+np.abs(along-far)
    score[along < 12] = np.inf
    j = np.argmin(score)
    return pins[j] if score[j] < 32 else None


def _forward(x, phases):
    ax, ay, g, l, a, b, c = x
    A = np.tile([ax, ay], (len(phases), 1))
    B = A+l*np.array([np.cos(g), np.sin(g)])
    C = A+a*np.column_stack((np.cos(g+phases), np.sin(g+phases)))
    delta = B-C
    dist = np.maximum(np.linalg.norm(delta, axis=1), 1e-8)
    u = delta/dist[:, None]
    q = (b*b-c*c+dist*dist)/(2*dist)
    h2 = b*b-q*q
    n = np.column_stack((-u[:, 1], u[:, 0]))
    D = C+q[:, None]*u-np.sqrt(np.maximum(h2, 0))[:, None]*n
    return np.stack((A, B, C, D), axis=1), h2


def _geometry(frames, phases):
    reds, blues, rl, bl, det = [], [], [], [], []
    for im in frames:
        y, x = np.nonzero(_mask(im, (207, 97, 76)))
        red = np.column_stack((x, y))
        y, x = np.nonzero(_mask(im, (67, 105, 164)))
        blue = np.column_stack((x, y))
        reds.append(red)
        blues.append(blue)
        rl.append(_line(red))
        bl.append(_line(blue))
        det.append(_pins(im))
    A = _crank_pivot(reds, phases)
    B = _pivot(bl)
    # Choose between centroid and line-intersection initialization using pins.
    try:
        alt = _pivot(rl)
        def static_score(p):
            ds = [np.min(np.linalg.norm(pins-p, axis=1)) for pins, out in det if len(pins)]
            return np.median(ds) if ds else np.inf
        if static_score(alt) < static_score(A):
            A = alt
    except ValueError:
        pass
    for pivot in (A, B):
        near = []
        for pins, out in det:
            if len(pins):
                ds = np.linalg.norm(pins-pivot, axis=1)
                if ds.min() < 22:
                    near.append(pins[np.argmin(ds)])
        if len(near) >= max(3, len(frames)//3):
            pivot[:] = np.median(near, axis=0)
    ground = np.linalg.norm(B-A)
    g = np.arctan2(B[1]-A[1], B[0]-A[0])
    obs = np.full((len(frames), 4, 2), np.nan)
    for i, (pins, out) in enumerate(det):
        for j, pivot in enumerate((A, B)):
            if len(pins):
                ds = np.linalg.norm(pins-pivot, axis=1)
                if ds.min() < 16:
                    obs[i, j] = pins[np.argmin(ds)]
        C = _endpoint(pins, A, reds[i], np.array([np.cos(g+phases[i]), np.sin(g+phases[i])]))
        D = _endpoint(pins, B, blues[i], bl[i][1]) if bl[i] else None
        if C is not None:
            obs[i, 2] = C
        if D is not None:
            obs[i, 3] = D
    def length(j, k, fallback):
        v = np.linalg.norm(obs[:, j]-obs[:, k], axis=1)
        v = v[np.isfinite(v)]
        return np.median(v) if len(v) else fallback
    x = np.array([*A, g, ground, length(0, 2, ground*.3), length(2, 3, ground*.85), length(1, 3, ground*.75)])
    scale = float(max(frames.shape[1:3]))
    lo = np.array([-scale, -scale, g-np.pi, 5, 5, 5, 5])
    hi = np.array([2*scale, 2*scale, g+np.pi, 2*scale, 2*scale, 2*scale, 2*scale])
    x = np.clip(x, lo+1e-5, hi-1e-5)
    for iteration in range(3):
        valid = np.isfinite(obs).all(axis=2)
        def residual(z):
            pred, h2 = _forward(z, phases)
            extra = []
            for i in range(len(frames)):
                for ln, ends in ((rl[i], (0, 2)), (bl[i], (1, 3))):
                    if ln is None:
                        continue
                    p, d = ln
                    n = np.array([-d[1], d[0]])
                    for j in ends:
                        if not valid[i, j]:
                            extra.append(.5*((pred[i, j]-p)@n))
            return np.r_[(pred-obs)[valid].ravel(), np.minimum(h2, 0)/max(z[5], 1), extra]
        fit = least_squares(residual, x, bounds=(lo, hi), loss='soft_l1', f_scale=1.5, max_nfev=160)
        x = fit.x
        pred, h2 = _forward(x, phases)
        if iteration < 2:
            for i, (pins, out) in enumerate(det):
                obs[i] = np.nan
                if not len(pins):
                    continue
                distances = np.linalg.norm(pred[i, :, None]-pins[None], axis=2)
                for unused in range(min(4, len(pins))):
                    j, k = np.unravel_index(np.argmin(distances), distances.shape)
                    if distances[j, k] > 12:
                        break
                    obs[i, j] = pins[k]
                    distances[j, :] = np.inf
                    distances[:, k] = np.inf
    valid = np.isfinite(obs).all(axis=2)
    e = (pred-obs)[valid]
    diag = {'observed_per_joint': valid.sum(axis=0).tolist(), 'joint_rmse_px': float(np.sqrt(np.mean(e*e))) if len(e) else None}
    return x, pred, det, diag


def _gold(im):
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
    return ((hsv[:, :, 0] >= 11) & (hsv[:, :, 0] <= 40) & (hsv[:, :, 1] > 55) & (hsv[:, :, 2] > 65)).astype(np.uint8)


def _board_color(im):
    H, W = im.shape[:2]
    a = im[H//12:11*H//12, W//12:11*W//12].reshape(-1, 3).astype(np.int32)
    a = a[(a.min(axis=1) > 195) & (np.ptp(a, axis=1) < 32)]
    if not len(a):
        return np.array([245, 245, 240], float)
    b = a//4
    key = b[:, 0]*4096+b[:, 1]*64+b[:, 2]
    k = np.argmax(np.bincount(key, minlength=64**3))
    return np.median(a[key == k], axis=0)


def _body(p, C, u):
    d = p-C
    return np.column_stack((d@u, d@np.array([-u[1], u[0]])))


def _sample(a, n, rng):
    return a if len(a) <= n else a[rng.choice(len(a), n, replace=False)]


def _remap(im, x, y):
    return cv2.remap(im.astype(np.float32), np.asarray(x, np.float32), np.asarray(y, np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)


def _guard(frames, pred, board):
    # Recover static opaque regions from their pixels, not their displacement.
    ims = frames[np.linspace(0, len(frames)-1, min(7, len(frames))).astype(int)].astype(np.float32)
    med = np.median(ims, axis=0)
    stable = np.max(np.abs(ims-med), axis=(0, 3)) < 5
    neutral = (np.ptp(med, axis=2) < 42) & (med.min(axis=2) > 105)
    different = np.linalg.norm(med-board, axis=2) > 13
    raw = (stable & neutral & different).astype(np.uint8)
    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    contours, hierarchy = cv2.findContours(raw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result = np.zeros(raw.shape, np.uint8)
    H, W = raw.shape
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        if min(w, h) < 13 or area < 140 or w > .65*W or h > .65*H or area < .55*w*h:
            continue
        if any(cv2.pointPolygonTest(c, tuple(map(float, p)), True) > -8 for p in pred[0, :2]):
            continue
        cv2.drawContours(result, [c], -1, 1, -1)
    if not result.any():
        return None
    inside = cv2.distanceTransform(result, cv2.DIST_L2, 5)
    outside = cv2.distanceTransform(1-result, cv2.DIST_L2, 5)
    return outside-inside


def _width(masks, pred):
    widths = []
    vv = np.arange(-24, 24.01, .5)
    for i in range(0, len(masks), max(1, len(masks)//8)):
        C, D = pred[i, 2:4]
        u = (D-C)/np.linalg.norm(D-C)
        n = np.array([-u[1], u[0]])
        for t in np.linspace(.12, .88, 11):
            p = C+t*(D-C)+vv[:, None]*n
            z = _remap(masks[i], p[:, 0][None], p[:, 1][None]).ravel() > .5
            mid = len(vv)//2
            if not z[mid]:
                continue
            a, b = mid, mid
            while a > 0 and z[a-1]:
                a -= 1
            while b+1 < len(z) and z[b+1]:
                b += 1
            if a and b < len(z)-1:
                widths.append((b-a+1)*.25)
    return float(np.percentile(widths, 15)) if widths else 4.


def _atlas(frames, pred, L, masks, board, sdf):
    # Each body pixel gets votes only when its material or bare board is visible.
    step = max(1., L/240.)
    xs = np.arange(-L, 2*L+step, step)
    ys = np.arange(-L, L+step, step)
    X, Y = np.meshgrid(xs, ys)
    gold = np.zeros(X.shape, np.float32)
    empty = np.zeros_like(gold)
    hidden = np.zeros_like(gold)
    for im, m, joints in zip(frames, masks, pred):
        C, D = joints[2:4]
        u = (D-C)/np.linalg.norm(D-C)
        xx = C[0]+X*u[0]-Y*u[1]
        yy = C[1]+X*u[1]+Y*u[0]
        d = im.astype(np.float32)-board
        bg = (np.sum(d*d, axis=2) < 8**2).astype(np.uint8)
        gold += _remap(m, xx, yy)
        empty += _remap(bg, xx, yy)
        if sdf is not None:
            hidden += (_remap((sdf < -3).astype(np.uint8), xx, yy) > .9)
    total = gold+empty
    p = (gold >= 1.5) & (gold > .8*np.maximum(total, 1))
    n = (empty >= 1.5) & (empty > .9*np.maximum(total, 1))
    dneg = cv2.distanceTransform((~n).astype(np.uint8), cv2.DIST_L2, 5)*step
    edge = p & (dneg < 2.8)
    q = np.stack((X, Y), axis=-1)
    feasible = q[hidden >= max(1, len(frames)-1)] if sdf is not None else np.empty((0, 2))
    return q[p], q[n], q[edge], feasible, step


def _rays(q, anchor, width, count=4):
    if len(q) < 8:
        return []
    z = q-np.array([anchor, 0.])
    z = z[np.linalg.norm(z, axis=1) > max(10., 3*width)]
    if not len(z):
        return []
    aa = np.linspace(-np.pi, np.pi, 720, endpoint=False)
    scores = np.zeros(len(aa))
    for k in range(0, len(aa), 40):
        a = aa[k:k+40]
        c, s = np.cos(a), np.sin(a)
        along = z[:, 0, None]*c+z[:, 1, None]*s
        across = -z[:, 0, None]*s+z[:, 1, None]*c
        scores[k:k+40] = np.sum(np.maximum(0, 1-(across/width)**2)*(along > 0), axis=0)
    out = []
    for unused in range(count):
        j = np.argmax(scores)
        if scores[j] < 3:
            break
        a = aa[j]
        out.append(float(a))
        da = np.arctan2(np.sin(aa-a), np.cos(aa-a))
        scores[np.abs(da) < .06] = 0
    return out


def _intersection(a, b, L):
    u = np.array([np.cos(a), np.sin(a)])
    v = np.array([np.cos(b), np.sin(b)])
    M = np.column_stack((u, -v))
    if abs(np.linalg.det(M)) < .015:
        return None
    t = np.linalg.solve(M, [L, 0.])
    p = t[0]*u
    return p if t.min() > 0 and np.linalg.norm(p) < 3*L else None


def _seg(q, a, b):
    v = b-a
    d = q-a
    t = np.clip((d@v)/max(float(v@v), 1e-9), 0, 1)
    return np.linalg.norm(d-t[:, None]*v, axis=1)


def _hidden_point(frames, pred, L):
    rng = np.random.default_rng(917)
    masks = [_gold(im) for im in frames]
    board = _board_color(frames[0])
    sdf = _guard(frames, pred, board)
    w = _width(masks, pred)
    pos, neg, edge, feasible, step = _atlas(frames, pred, L, masks, board, sdf)
    if len(pos) < 20:
        p = np.median(feasible, axis=0) if len(feasible) else np.array([L/2, 0.])
        return p, {'point_method': 'unresolved', 'weakly_constrained': True}
    # Keep boundary and off-base evidence; repeated frames must not outvote it.
    off = pos[np.abs(pos[:, 1]) > w+1]
    ep = edge[np.abs(edge[:, 1]) > w+1]
    seeds = []
    for evidence in (off, ep):
        q = _sample(evidence, 1400, rng)
        for reverse in (False, True):
            anchor, other = (L, 0.) if reverse else (0., L)
            for a in _rays(q, anchor, max(2., .65*w), 4):
                z = q-[anchor, 0.]
                dist = np.abs(-z[:, 0]*np.sin(a)+z[:, 1]*np.cos(a))
                rest = q[dist > max(3., w)]
                for b in _rays(rest, other, max(2., .65*w), 4):
                    p = _intersection(b, a, L) if reverse else _intersection(a, b, L)
                    if p is not None:
                        seeds.append(p)
    # Search the measured visibility-feasible set, not the cover's center.
    seeds.extend(_sample(feasible, 100, rng))
    for sign in (-1, 1):
        side = off[sign*off[:, 1] > 0]
        if len(side):
            e = side[sign*side[:, 1] >= np.percentile(sign*side[:, 1], 75)]
            for p in _sample(e, 12, rng):
                seeds.extend([p, np.array([p[0], 1.6*p[1]])])
    if not seeds:
        seeds = [np.array([L/2, 0.])]
    C = pred[:, 2]
    U = pred[:, 3]-C
    U /= np.linalg.norm(U, axis=1)[:, None]
    A, B = np.array([0., 0.]), np.array([L, 0.])
    def visibility(p):
        if sdf is None:
            return np.empty(0)
        xy = C+p[0]*U+p[1]*np.column_stack((-U[:, 1], U[:, 0]))
        # A white/dark marker core would be detectable unless actually covered.
        d = _remap(sdf, xy[:, 0][None], xy[:, 1][None]).ravel()
        return np.maximum(d+3., 0.)
    def make_residual(pp, nn, ee, kind):
        q = np.concatenate((pp, nn, ee))
        np_, nn_ = len(pp), len(nn)
        base = _seg(q, A, B)
        bn = math.sqrt(max(np_, 1)/max(nn_, 1))
        be = math.sqrt(max(np_, 1)/max(len(ee), 1))*.65
        def residual(z):
            p, wb, ws = z[:2], z[2], z[3]
            d1, d2 = _seg(q, A, p), _seg(q, B, p)
            if kind == 'filled_triangle':
                s = 1. if p[1] >= 0 else -1.
                c1 = s*q[:, 1]
                c2 = s*((p[0]-L)*q[:, 1]-p[1]*(q[:, 0]-L))
                c3 = s*(p[1]*q[:, 0]-p[0]*q[:, 1])
                inside = (c1 >= 0) & (c2 >= 0) & (c3 >= 0)
                tri = np.minimum(base, np.minimum(d1, d2))
                tri = np.where(inside, -tri, tri)
                d = np.minimum(base-wb, tri-ws)
            else:
                d = np.minimum(base-wb, np.minimum(d1, d2)-ws)
            rp = np.maximum(d[:np_]+.35, 0)
            rn = np.maximum(.35-d[np_:np_+nn_], 0)*bn
            re = (d[np_+nn_:]+.45)*be
            rv = visibility(p)*math.sqrt(max(np_, 1)/max(len(frames), 1))
            return np.r_[rp, rn, re, rv]
        return residual
    # Empty observations cover the full body region, including unsupported ends.
    p0 = np.concatenate((_sample(pos, 800, rng), _sample(off, 550, rng)))
    n0 = _sample(neg, 2000, rng)
    e0 = _sample(edge, 650, rng)
    lo = np.array([-L, -L, .6, .4])
    hi = np.array([2*L, L, max(3., 2*w), max(3., 2*w)])
    def score(r):
        return float(np.mean(np.sqrt(1+(r/.8)**2)-1))
    fits = []
    for kind in ('open_frame', 'filled_triangle'):
        fun = make_residual(p0, n0, e0, kind)
        candidates = []
        for p in seeds:
            z = np.clip(np.r_[p, w, max(1., .4*w)], lo+1e-5, hi-1e-5)
            candidates.append((score(fun(z)), z))
        candidates.sort(key=lambda item: item[0])
        starts = []
        for cost, z in candidates:
            if all(np.linalg.norm(z[:2]-old[:2]) > max(4., .04*L) for old in starts):
                starts.append(z)
            if len(starts) == 4:
                break
        for z in starts:
            fit = least_squares(fun, z, bounds=(lo, hi), loss='soft_l1', f_scale=.8, max_nfev=75, ftol=2e-5, xtol=2e-5)
            fits.append((score(fun(fit.x)), kind, fit.x))
    # All model classes are compared using the same larger evidence set.
    pf = np.concatenate((_sample(pos, 1700, rng), _sample(off, 1000, rng)))
    nf = _sample(neg, 4200, rng)
    ef = _sample(edge, 1300, rng)
    refined = []
    for kind in ('open_frame', 'filled_triangle'):
        group = sorted([f for f in fits if f[1] == kind], key=lambda t: t[0])
        fun = make_residual(pf, nf, ef, kind)
        for cost, unused, z in group[:2]:
            fit = least_squares(fun, z, bounds=(lo, hi), loss='soft_l1', f_scale=.8, max_nfev=100, ftol=1e-6, xtol=1e-6)
            refined.append((score(fun(fit.x)), kind, fit, fun))
    refined.sort(key=lambda t: t[0])
    cost, kind, best, fun = refined[0]
    information = best.jac.T@best.jac
    marginal = information[:2, :2]-information[:2, 2:]@np.linalg.pinv(information[2:, 2:])@information[2:, :2]
    eig = np.linalg.eigvalsh(marginal)
    alternatives = [dict(model=k, score=float(s), point_body_px=f.x[:2].tolist()) for s, k, f, unused in refined if s <= cost*1.15+.015]
    spread = max([np.linalg.norm(np.array(a['point_body_px'])-best.x[:2]) for a in alternatives]+[0.])
    return best.x[:2], {'point_method': 'rigid_atlas_boundary_and_visibility', 'support_model': kind, 'support_score': cost, 'gold_body_pixels': int(len(pos)), 'empty_body_pixels': int(len(neg)), 'boundary_body_pixels': int(len(edge)), 'measured_base_halfwidth_px': w, 'fitted_halfwidths_px': best.x[2:].tolist(), 'guard_mask_used': sdf is not None, 'visibility_violation_px': float(np.max(visibility(best.x[:2]))) if sdf is not None else None, 'point_information_eigenvalues': eig.tolist(), 'weakly_constrained': bool(eig[0] < .02 or spread > 5), 'competitive_explanations': alternatives}


def infer(frames: np.ndarray, phases: np.ndarray) -> dict:
    frames = np.asarray(frames, dtype=np.uint8)
    phases = np.asarray(phases, dtype=float)
    if frames.ndim != 4 or frames.shape[-1] != 3 or len(frames) != len(phases):
        raise ValueError('Expected N,H,W,3 frames and N phases')
    x, pred, detections, diag = _geometry(frames, phases)
    L = float(x[5])
    measurements = []
    for joints, (pins, outputs) in zip(pred, detections):
        if len(outputs):
            C, D = joints[2:4]
            u = (D-C)/np.linalg.norm(D-C)
            measurements.extend(_body(outputs, C, u))
    if measurements:
        m = np.array(measurements)
        # Reject unrelated purple details using rigid-coordinate consensus.
        distances = np.linalg.norm(m[:, None]-m[None], axis=2)
        seed = np.argmax(np.sum(distances < 4, axis=1))
        good = distances[seed] < 4
        p = least_squares(lambda z: (m[good]-z).ravel(), np.median(m[good], axis=0), loss='soft_l1', f_scale=1.).x
        pdiag = {'point_method': 'visible_marker_rigid_consensus', 'observed_output_pins': int(good.sum()), 'weakly_constrained': False}
    else:
        p, pdiag = _hidden_point(frames, pred, L)
        pdiag['observed_output_pins'] = 0
    diag.update(pdiag)
    return {'origin': x[:2].tolist(), 'ground_angle': float(x[2]), 'ground_length': float(x[3]), 'crank_length': float(x[4]), 'coupler_length': L, 'rocker_length': float(x[6]), 'coupler_fraction': float(p[0]/L), 'coupler_offset': float(p[1]), '_diagnostics': diag}
