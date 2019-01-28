---
layout: post
title:  "Netflix Architecture"
date:   2019-01-27 3:11:06 -0700
categories: notes
---

**This article is mostly adapted from [here](http://highscalability.com/blog/2017/12/11/netflix-what-happens-when-you-press-play.html). However, the article is laboriously long and not enough meat. This is, what I hope, a condensed version.**   

The obvious way to build a video streaming service would be to store videos on S3 and then stream them over the internet to the user. This would be massively costly (AWS is expensive) and probably isn't very scalable.

Netflix runs on the cloud using two services : AWS and OpenConnect (their custom CDN). Initially, Netflix started by using their own datacenter but costs and service outages caused them to move to AWS. The reason they gave was "undifferentiated heavy lifting" i.e. things that had to be done but don't contribute to the core value of the business.

Netflix operates out of three AWS regions: North Virginia, Portland Oregon, and Dublin Ireland. When you play videos via Netflix, your device connects to one these regions and if one the regions fails, then you are redirected to one of the other regions. Thus, a user can be served out of any of these regions. They call this the global services model. They also perform a stress test every month, where they cause a region to fail on purpose. Surprisingly, using AWS turns out to be cheaper for Netflix even at their scale compared to rolling their own.

What does AWS do for Netflix?

- Scalable Compute and Storage
- Scalable Distributed Databases (they use DynamoDB and Cassandra)
- Big Data Analytics
-  Recommendations

Netflix obtains videos from what are called source media (usually terabytes in size). These need to be converted into files which provide the optimal viewing experience for each supported device and hence, source media are *transcoded* into different formats according to device type, network quality, audio quality, subtitles etc. This process of transcoding outputs 100's of files from each file. Now, because the source files are many terabytes in size, they are transcoded in parallel on a large number of EC2 servers after breaking them into small chunks. Netflix says a typical source media file can be pushed to their CDN in about 30 minutes.

In addition to AWS, Netflix uses a in-house CDN called OpenConnet to maximize network efficiency. They initially tried 3rd party CDNs but they turned out to be expensive and not unto the mark quality wise. Since Netflix knows what their clients like and where they are located, they could also make smart optimizations which 3rd party solutions cannot make.  

Netflix developed its own video storage device called an OpenConnect Appliance (OCA). Each OCA is basically a fast server optimized for delivering videos with lots of storage. It's made from commodity PC parts. On the software side, each OCA runs FreeBSD and NGINX as its server. OCAs come in various sizes where the largest ones can store the entire catalog. Each CDN site houses a cluster of OCAs depending on how reliable Netflix wants the site to be.

Netflix doesn't have its own network nor its own datacenter instead it places clusters of OCAs in ISP datacenters and in IXPs. When you press play, your device streams video from an OCA in a datacenter near you to maximize network efficiency. This arrangement is beneficial for ISPs as well since now the video streaming data does not have to flow over the internet backbone and stays firmly on the ISP's own network. Another optimization is to prefetch popular videos in smaller OCAs. Netflix uses a hierarchical caching system where small OCAs store a few popular videos, larger OCAs store a large proportion of the catalogue and the largest OCAs store the entire catalogue (these get their videos from S3). Thus, a cache miss *never* happens in OpenConnect. If a video is not available in a smaller OCA, it is copied from an OCA at or near that datacenter site.

Netflix predicts the videos to place in smaller OCAs according to user preferences in a data driven fashion. The predictions happen one day in advance and so any new videos to be copied are transferred in off peak hours thereby reducing network congestion. To prevent popular videos from overwhelming OCAs, they are copied to multiple OCAs at one datacenter location. Additionally, a video is not said to be live until it has been copied by a sufficient number of OCAs so that videos can be streamed in a similar amount of time anywhere in the world. OpenConnect provides reliability by switching OCAs in case of OCA failure or network congestion.

  


<!--stackedit_data:
eyJoaXN0b3J5IjpbOTg5MTUyMzgyLC02NDU0ODk1MDAsLTE3Nj
AwNDg3MzUsLTMwNjc5NDA5MCwtMzAxOTA1NDA5LDE0NDY1OTQz
ODQsMzU4NDkwMjk1LC0xMDU3Njc5MTQsLTE1NjY1NTc0OTNdfQ
==
-->