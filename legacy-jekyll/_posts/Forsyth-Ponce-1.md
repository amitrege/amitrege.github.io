### Pinhole Perspective
We take the pinhole to be the origin of the co-ordinate system with X-Y plane taken to be parallel to the plane of the screen. The approximation here is that, we assume that the pinhole is a single point (in practice, this is impossible).

A light ray coming from the object and going through a pinhole falls onto an image screen under this setting. These points (P (on object), O (pinhole) and p(point on image)) are collinear. Also, note that the image formed on the screen will be inverted as the light ray travels in a straight line, therefore, a ray starting at the top will travels towards the bottom (because it has to pass through the pinhole).

We can write this as $\vec{Op} = \lambda \vec{OP}$. Thus, resolving  the components, we get $$x = \lambda X,\ y = \lambda Y,\ d =\lambda Z$$

Here, we assume we know $d$ which is the distance of the screen from the pinhole (we set this distance). Therefore, we have $$ x = d\frac{X}{Z},\ y = d\frac{Y}{Z}  $$

Thus, we can calculate the size of the image based on the size of the object and its distance from the pinhole.

### Weak Perspective (or scaled orthography)
A line segment ($\vec{PQ}$) on an object plane parallel to the screen plane will appear as $\vec{pq}$ parallel to $\vec{PQ}$ i.e. $x = -mX,\ y = -mY$. The negative sign indicates the the direction of the vector has been reversed (due to images being inverted). The factor $m$ is called magnification.

The additional assumption made in weak perspective is that, all the points o n the object are at the same distance from the camera. Thus, we can ignore the distance of each point from the camera and write $x = -mX,\ y = -mY$ for all points on the object. This is a reasonable assumption when the distance of the object is large compared to the depth of the object along the line of sight.

**Orthographic projection** is when we assume that the rays of light travel parallel to the **k** axis. In this case, the camera is at a constant distance from the object. Therefore, we can write $x = X,\ y = Y$ with m = -1 (normalizing image co-ordinates). Note, there is no image reversal here (m is negative). 




<!--stackedit_data:
eyJoaXN0b3J5IjpbMTk2MDAxMjk5MiwtNjIzNjAxMDIxLC0xOT
I5NzM1OTIzLC0xMzA2Mjk0NzA1LC01OTg4NzUwMzJdfQ==
-->