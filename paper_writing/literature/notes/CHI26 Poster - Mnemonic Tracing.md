Mnemonic Tracing: Using Eye Gaze to Search for Visual Memories
Wazeer Zulfikar∗
MIT Media Lab
Cambridge, USA
wazeer@media.mit.edu
Yasith Samaradivakara∗
MIT Media Lab
Cambridge, USA
yasith@media.mit.edu
Paul Pu Liang
MIT Media Lab
Cambridge, USA
ppliang@media.mit.edu
Pattie Maes
MIT Media Lab
Cambridge, USA
pattie@media.mit.edu
Figure 1: Scenario showing interaction with smartglasses using mnemonic tracing to digitally retrieve an image seen earlier
Abstract
While modern image retrieval systems rely on natural language,
some users struggle or are unable to verbalize specific visual memo-
ries. Drawing on gaze reinstatement research, we introduce mnemonic
tracing: a non-verbal interaction where users intentionally exter-
nalize mental images by tracing them onto a blank space using eye
gaze. We conducted a pilot study (𝑁= 11) to evaluate retrieval
of 30 images of people, objects, and locations using eye-tracking
glasses. Without training data or prior user training, our system
achieved Top-1 accuracy of 30.5% (compared to 3.3% chance level)
and a Top-3 accuracy of 51.2%. We show performance is influenced
by individual imagery vividness and task engagement, suggesting
success is driven by active mental reconstruction. Highlighting its
practical potential, participants reported moderately high perceived
usefulness (𝑀= 3.58/5,𝑆𝐷= 0.82) on the Technology Acceptance
Model survey. The method offers a private, hands-free, and inclu-
sive alternative for scenarios where a text- or voice-based search is
inaccessible.
∗Contributed equally to this research.
This work is licensed under a Creative Commons Attribution-NonCommercial-
NoDerivatives 4.0 International License.
CHI EA ’26, Barcelona, Spain
© 2026 Copyright held by the owner/author(s).
ACM ISBN 979-8-4007-2281-3/26/04
https://doi.org/10.1145/3772363.3799025
CCS Concepts
• Human-centered computing →Interaction techniques; Em-
pirical studies in HCI; Accessibility technologies; • Computing method-
ologies →Computer vision.
Keywords
Eye tracking, Gaze reinstatement, Gaze-based retrieval, Episodic
memory, Implicit interaction
ACM Reference Format:
Wazeer Zulfikar, Yasith Samaradivakara, Paul Pu Liang, and Pattie Maes.
2026. Mnemonic Tracing: Using Eye Gaze to Search for Visual Memories.
In Extended Abstracts of the 2026 CHI Conference on Human Factors in Com-
puting Systems (CHI EA ’26), April 13–17, 2026, Barcelona, Spain. ACM, New
York, NY, USA, 9 pages. https://doi.org/10.1145/3772363.3799025
1
Introduction
We frequently encounter the need to recall visual information from
our past, whether we are trying to find a specific photo from a trip,
share a discovery with friends, or look up a visual reference for
a shopping task. This process is tied to the structure of episodic
memory, which is often internally represented as visual images [8].
As we increasingly document our lives through always-on wearable
cameras and smartphones, our digital collections become valuable
extensions of our own visual memory. While modern systems have
made significant strides in retrieval through natural language de-
scriptions [26] and contextual metadata [24], these methods some-
times encounter a "semantic gap". This gap is particularly evident


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Zufikar and Samaradivakara, et al.
when a user cannot find the right words to describe a visual mem-
ory, or for users with speech or motor impairments who may find
traditional query entry methods cumbersome.
Prior work has shown that eye movements reflect underlying
cognitive processing [34]. During visual encoding, gaze plays a
critical role in binding visual elements and signaling event struc-
ture [9, 33]. Psychological research on gaze reinstatement further
demonstrates that during recall, people often recreate aspects of
these spatiotemporal eye movement patterns while mentally visu-
alizing a scene [22, 29, 38].
While Wang et al. demonstrated that involuntary recall gaze can
serve as a retrieval signal [37], they also suggested that the "small
effort" of making more extensive, intentional eye movements could
significantly improve system accuracy. We lean into this poten-
tial by introducing mnemonic tracing, a voluntary interaction
where users intentionally trace their mental imagery through eye
movements. By transforming gaze from a passive byproduct of
recall into an active retrieval tool, we enable a more expressive
and controllable interface that bridges the gap between internal
mental imagery and digital search. To evaluate this approach, we
present a pilot study to examine whether such spatiotemporal gaze
patterns can be harnessed as a functional interaction method for
visual retrieval. Our contributions include:
• The introduction of mnemonic tracing and a training-free
algorithm that ranks images based on spatiotemporal simi-
larity between encoding and voluntary recall gaze.
• A pilot study (𝑁= 11) achieving 51.2% Top-3 accuracy, with
a qualitative analysis of user experience while mnemonic
tracing and its real-world applicability.
2
Related Work
The retrieval of personal visual memories has evolved from manual
metadata tagging [15] and associative digital archives [13] to mul-
timodal and LLM-based querying systems [6, 24, 26, 39]. However,
when memories are difficult to verbalize, Sketch-Based Image Re-
trieval (SBIR) demonstrates that spatial representations can serve
as effective proxies for memory search [5, 12, 20]. Mnemonic trac-
ing extends this paradigm into the ocular domain, enabling users
to reconstruct visual memories through gaze without manual in-
put. Research on gaze interaction has traditionally emphasized
gaze-as-pointer selection [17, 21, 25], gaze gestures [3, 11], and
smooth-pursuit interaction [36]. Beyond explicit control, gaze has
been used to infer attention, intent, and cognitive state [2, 4, 7],
and more recently as an expressive modality for ocular drawing
and spatial manipulation [19, 31]. Systems have also leveraged gaze
to recognize objects and user intent [30, 35] and extended to mo-
bile devices[23]. Yet, most gaze-based interfaces rely on externally
visible stimuli rather than internally generated mental imagery.
While Wang et al. [37] demonstrated that involuntary recall gaze
can support image retrieval, they suggested that performance could
improve with intentional eye movements. Building on this insight
and recent mnemonic tools such as Eye2Recall [16], we transform
gaze reinstatement from an involuntary cognitive byproduct into
an intentional interaction technique. By leveraging the link be-
tween voluntary mental imagery and spatiotemporal gaze patterns,
mnemonic tracing introduces a hands-free, non-verbal mecha-
nism for navigating personal visual archives.
3
Gaze-Based Retrieval Algorithm
Our retrieval algorithm models memory-guided recall as the rein-
statement of coarse spatiotemporal attentional structure. Rather
than learning image-specific representations, we directly compare
gaze patterns produced during encoding and voluntary recall. Prior
work shows that involuntary recall gaze is often sparse, spatially
distorted, and difficult to align across trials, motivating deformation-
tolerant metrics such as Earth Mover’s Distance (EMD) [37]. In
contrast, our mnemonic tracing paradigm elicits deliberate and
spatially expressive gaze behavior, producing denser and more
structured fixation patterns. This allows recall to be modeled as
continuous spatial attentional distributions, enabling direct compar-
ison between encoding and retrieval without supervised training.
The algorithm operates on fixation-level features—location, dura-
tion, and temporal order—which capture sustained and semantically
meaningful visual attention during both encoding and recall. Each
eye-tracking trial is represented as a sequence of fixations with
location (𝑥𝑖,𝑦𝑖) and duration 𝑑𝑖. Fixations are projected onto screen
space and converted into a spatial attentional map by accumulating
duration-weighted Gaussian responses:
𝐻(𝑥,𝑦) =
∑︁
𝑖
𝑑𝑖· N  (𝑥,𝑦); (𝑥𝑖,𝑦𝑖), 𝜎2𝐼,
(1)
where 𝜎controls spatial tolerance. The resulting map is normalized
such that Í
𝑥,𝑦𝐻(𝑥,𝑦) = 1.
To incorporate temporal structure without enforcing strict scan-
path alignment, we compute an additional prefix attentional map
using only the first 𝐾fixations, denoted 𝐻(𝐾) (𝑥,𝑦). This repre-
sentation captures early attentional organization while remaining
robust to variability in recall order. Given an encoding trial 𝑒and a
retrieval trial 𝑟, similarity between attentional maps is computed
using the Bhattacharyya coefficient:
BC(𝐻𝑒, 𝐻𝑟) =
∑︁
𝑥,𝑦
√︁
𝐻𝑒(𝑥,𝑦) 𝐻𝑟(𝑥,𝑦),
(2)
which quantifies overlap between normalized spatial distributions.
Final similarity is defined as a weighted combination of prefix-based
and full-trial similarity:
𝑆(𝑒,𝑟) = 𝛼BC 𝐻(𝐾)
𝑒
, 𝐻(𝐾)
𝑟
 + (1 −𝛼) BC 𝐻𝑒, 𝐻𝑟
.
(3)
This formulation balances spatial and temporal information, and
is robust to moderate spatial distortion while supporting subject-
specific retrieval. For reference, we include EMD-based comparisons
in Appendix D, where the proposed approach consistently outper-
forms deformation-based matching in the voluntary tracing setting.
Algorithm 1 summarizes the retrieval procedure, with additional
implementation details provided in Appendix C.
4
Study Design
We conducted a controlled laboratory experiment to evaluate the
feasibility of mnemonic tracing for visual retrieval and the gaze-
based retrieval algorithm. The study used Pupil Labs Neon eye-
tracking glasses [32] to capture eye gaze during encoding and re-
calling for three categories of images: people, objects, and locations.


---

Mnemonic Tracing
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Figure 2: Example of gaze-based retrieval algorithm from study. The scanpaths are from the eye movements during the encoding
and retrieval phases of the same image. The gaussian heatmaps are generated which are matched using the Bhattacharyya
coefficient.
Algorithm 1 Gaze-Based Retrieval via Gaussian Attention Maps
(GAMR)
Require: Encoding trials 𝐸𝑠, Retrieval trials 𝑅𝑠, Gaussian width 𝜎,
prefix length 𝐾, blend weight 𝛼
Ensure: Top-𝑘retrieval performance
1: Precompute full and prefix maps with temporal encoding
{(𝐻𝑒, 𝐻(𝐾)
𝑒
)}𝑒∈𝐸𝑠
2: for each retrieval trial 𝑟∈𝑅𝑠do
3:
Compute (𝐻𝑟, 𝐻(𝐾)
𝑟
)
4:
for each encoding trial 𝑒∈𝐸𝑠do
5:
𝑆(𝑒,𝑟) ←𝛼BC(𝐻(𝐾)
𝑒
, 𝐻(𝐾)
𝑟
) + (1 −𝛼) BC(𝐻𝑒, 𝐻𝑟)
6:
end for
7:
Rank 𝑒by 𝑆(𝑒,𝑟); record Top-𝑘
8: end for
Eye-movement events were extracted using the standard processing
pipeline. The study sequence of encoding, recall, and experiential
phases, lasting approximately 40 minutes, is illustrated in Figure 6.
Participants. We recruited 11 participants (age: 𝑀= 27.27,𝑆𝐷=
10.48; 5 male, 6 female). Eligible participants were at least 18 years
old with normal or corrected-to-normal vision and no eye disor-
ders. Following university ethical approval [Anonymous Approval
ID], each received $20 USD compensation. Individual visual im-
agery ability was assessed via the Vividness of Visual Imagery
Questionnaire (VVIQ) [27], with scores ranging from 53 to 78
(𝑀= 62.00,𝑆𝐷= 8.15).
Procedure. Participants were seated 1 m from a 4K display with
head position stabilized by a chin rest to minimize head movement.
A custom web interface synchronized stimuli with the eye-tracking
data. Participants completed six experimental sets, each containing
five AI-generated images (examples in Appendix). Detailed instruc-
tions provided to participants are included in Appendix, and set
order was counterbalanced via Latin square.
During the encoding phase, as shown in Figure 6, participants
were shown 3-8 word textual cues followed by the stimuli. They
were instructed to memorize the image for 7 seconds while voluntar-
ily tracing the distinctive details using their eye gaze. 7 seconds was
determined through empirically to allow for participants to be able
to remember the image well in the task. Following a one-minute
distractor task, during recall phase, participants mentally projected
the image onto a blank screen ( “look-at-nothing” paradigm [22] to
reduce bottom-up distractions) for 7 seconds, tracing details from
memory with their eyes. After each trial, participants rated vivid-
ness of the recalled image in their mind and confidence that it was
the correct image, on 5-point Likert scales. During the experience
phase, participants chose one image from the current set to recall
a second time. Our algorithm (Section 1) then retrieved and dis-
played an image based on the trace (took around 3 seconds). Finally,
participants completed NASA-TLX [18], Technology Acceptance
Model survey [10], and open-ended survey questions.
5
Results & Discussion
5.1
Technical Evaluation
Encoding–retrieval pairs in which participants rated recall vivid-
ness or confidence as Not at all or Slightly were excluded, yielding
295 valid trials out of 330. Applying the gaze-based retrieval algo-
rithm to these trials achieved mean accuracies of 30.5% (Top-1),
51.2% (Top-3), and 60.0% (Top-5), substantially exceeding chance
performance (3.3%, 10.0%, and 16.7%, respectively; Table 5). When
restricting retrieval to images within the same semantic category,
performance remained consistently above chance, with variability
across participants (Figure 4A). In a more constrained within-set
condition (five images per set), mean Top-1 accuracy increased to
53.2% (chance: 20%;). Associations between imagery ability (VVIQ),
subjective workload (NASA-TLX), and retrieval accuracy are shown
in Figure 4B. During the experience phase, the system correctly
retrieved the intended image in 60.6% of 60 trials.


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Zufikar and Samaradivakara, et al.
Encoding Phase
Recall Phase
Experience Phase
Post-Study Survey
Distractor Task
Pre-Study Survey
Instructions & Setup
Memorize each  
image after associated 
cue presentation
Visualize each image 
using cue looking at 
blank screen
Choose any image and 
visualize to see system 
performance
TLX, TAM & Open-
ended questions
Visual attention game
Demographics & VVIQ
Written instructions 
& video example
3 min
5 min
7 sec x 5 images
1 min
7 sec x 5 images
7 sec
7 min
1 practice + 6 sets = 20 min
Person 
holding 
coffee
Person 
holding 
coffee
Pick any 
image
Figure 3: Overview of the study workflow, detailing the sequence and timing of the encoding, distractor, recall, and experience
phases.
Figure 4: (a) Top-3 retrieval accuracy across image categories (objects, people, and locations). (b) Relationship between participant
measures and retrieval performance. Left: Correlation between VVIQ scores and Top-3 retrieval accuracy. Right: Correlation
between NASA-TLX scores and Top-3 retrieval accuracy. Shaded regions indicate 95% confidence intervals. Shows higher imagery
vividness and increased task engagement associated with improved retrieval performance
P1
P2
P3
P4
P5
P6
P7
P8
P9
P10
P11
Overall
Chance
Top-1
36.7
19.0
21.7
27.6
17.2
40.0
33.3
33.3
32.1
26.7
50.0
30.5
3.3
Top-3
50.0
47.6
56.5
44.8
34.5
66.7
59.3
60.0
50.0
40.0
55.6
51.2
10.0
Top-5
63.3
57.1
65.2
48.3
41.4
70.0
70.4
66.7
60.7
56.7
61.1
60.0
16.7
Table 1: Per-participant retrieval accuracy. Chance assumes uniform random selection from 30 images.
5.2
Experience of the Mnemonic Tracing
Process
Participants described mnemonic tracing as an active reconstruc-
tion requiring significant focus. Some noted a "tension" (P10) be-
tween involuntary movement and intentional control, with P7 and
P11 emphasizing the need to trace "object by object" to avoid "zoning
out." This engagement is reflected in our quantitative data (Fig. 4),
where higher NASA-TLX scores correlate with improved retrieval.
Beyond search, P9 viewed the interaction as a "mindful activity"
that could encourage users to pay more attention to their surround-
ings. While sustained effort occasionally caused eyes to wander
(P5), the process remains a focused attempt to translate internal
imagery into a digital format.
Mapping these images onto a blank canvas involved specific
spatial and temporal challenges. Participants sometimes struggled
with "exact dimensions" (P7) and "absolute position" (P8), with P3
often "tracing slightly smaller versions" of the original stimuli. Fur-
thermore, P9 observed that visualization occurs "sequentially" and
can be "slower" than expected. These accounts align with the posi-
tive trend between VVIQ scores and accuracy (Fig. 4), suggesting
that vividness aids retrieval. Ultimately, these findings character-
ize mnemonic tracing as a personalized experience of recalling
memory, shaped by an individual’s internal clarity and spatial co-
ordination.


---

Mnemonic Tracing
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
5.3
Potential Real-World Applications
Participants reported a moderately high perceived usefulness (𝑀=
3.58,𝑆𝐷= 0.82) in the TAM subscale, indicating a general openness
to adopting gaze-to-recall as a practical retrieval tool. To evaluate
the potential utility of mnemonic tracing, we analyzed participant
responses regarding potential real-world applications using Braun
& Clarke thematic analysis [1], which revealed four primary areas:
(1) Memory Aids and Learning: Participants envisioned the
system as a tool for "painting a picture in my head” (P5) to aid
recall later. It was noted that it could be useful for navigating
"memory palaces that people try to remember a lot of things”
(P3) and for use in “visual learning settings” (P7).
(2) Image and Video Retrieval: Users suggested the modality
for "image retrieval in photo files” (P1) or "finding a category of
pictures related to a memory” (P11). P8 highlighted a temporal
use case: locating a specific moment when one “did not recall
in what order I had taken a specific video or scenery.”
(3) Spatial and Dynamic Navigation: P4 found the system
could be valuable when "searching for something specific
within that [visual] space.”. P9 suggested it is uniquely suited
for "reliving an experience rather than retrieving a fixed stored
image,”, specifically by “trace[ing] the movement of the main
foreground object.”
(4) Accessibility and Forensics: Participants identified appli-
cations for users who are "mute and unable to use your hands”
(P2). Others suggested forensic utility, such as "remembering
faces” (P10) or recalling an “attacker’s face” (P2) when verbal
descriptions are insufficient.
6
Limitations and Future Work
While our work demonstrates the feasibility of mnemonic tracing
to retrieve previously seen images in a controlled environment,
we identify several limitations in the study design and technical
implementation.
Firstly, the evaluation utilized a restricted set of static images.
In real-world deployments, naturalistic visual stimuli are observed
from various angles and may appear structurally similar. Further-
more, the current implementation does not fully account for head
movements. In natural settings, gaze is a coordinated effort between
the eyes and the head. Future iterations must account for these geo-
metric transformations and body movements to ensure that mental
tracing remains robust to unconstrained environments. Secondly,
the temporal gap between encoding and retrieval was relatively
short. Human memory is subject to decay over time, and it remains
to be seen how gaze query fidelity diminishes as the original vi-
sual memory fades. Extending this delay to hours or days will help
investigate the longitudinal reliability of gaze reinstatement.
Finally, our study population consisted primarily of younger
adults. Cognitive visualization and oculomotor control vary across
the lifespan, so results may not generalize to older populations. Fur-
thermore, individual variability in microsaccades must be accounted
for [14, 28]. Ultimately, this study serves as a step toward a class of
non-verbal, memory-augmented interfaces for a naturally-aligned
search experience.
References
[1] Virginia Braun and Victoria Clarke. 2006. Using thematic analysis in psychology.
Qualitative research in psychology 3, 2 (2006), 77–101.
[2] Andreas Bulling and Hans Gellersen. 2016. Pervasive attentive user interfaces.
IEEE Pervasive Computing 15, 2 (2016), 60–69.
[3] Andreas Bulling, Jamie A. Ward, Hans Gellersen, and Gerhard Tröster. 2011.
Eye movement analysis for activity recognition using electrooculography. 33, 4
(2011), 741–753. doi:10.1109/TPAMI.2010.86
[4] Georg Buscher, Edward Cutrell, and Meredith Morris. 2008. Attentive documents:
Eye tracking as implicit input for information retrieval. In Proceedings of the
SIGCHI Conference on Human Factors in Computing Systems (CHI). 299–308.
[5] Yang Cao, Hai Wang, Changhu Wang, Zhiwei Li, Liqing Zhang, and Lei Zhang.
2010. MindFinder: interactive sketch-based image search on millions of images.
1605–1608. doi:10.1145/1873951.1874299
[6] Xinlei Chen, Anoop Shrivatsa, and Kristen Grauman. 2017. Visual search in
personal photo collections. In Proceedings of the IEEE International Conference on
Computer Vision (ICCV).
[7] Yihua Cheng, Haofei Wang, Yiwei Bao, and Feng Lu. 2024.
Appearance-
based Gaze Estimation With Deep Learning: A Review and Benchmark.
arXiv:2104.12668 [cs.CV] https://arxiv.org/abs/2104.12668
[8] Martin A. Conway. 2009. Episodic memories. 47, 11 (2009), 2305–2313. doi:10.
1016/j.neuropsychologia.2009.02.003
[9] Claudia Damiano and Dirk B. Walther. 2019. Distinct roles of eye movements
during memory encoding and retrieval.
184 (2019), 119–129. doi:10.1016/j.
cognition.2018.12.014
[10] Fred D Davis et al. 1989. Technology acceptance model: TAM. Al-Suqri, MN,
Al-Aufi, AS: Information Seeking Behavior and Technology Adoption 205, 219 (1989),
5.
[11] Heiko Drewes and Albrecht Schmidt. 2007. Gaze gestures for human-computer in-
teraction. In Proceedings of the SIGCHI Conference on Human Factors in Computing
Systems (CHI). 1–10.
[12] M. Eitz, K. Hildebrand, T. Boubekeur, and M. Alexa. 2011. Sketch-Based Image
Retrieval: Benchmark and Bag-of-Features Descriptors. 17, 11 (2011), 1624–1636.
doi:10.1109/TVCG.2010.266
[13] Jim Gemmell, Gordon Bell, Roger Lueder, Steven Drucker, and Curtis Wong. 2002.
MyLifeBits: fulfilling the Memex vision. In Proceedings of the tenth ACM interna-
tional conference on Multimedia (New York, NY, USA, 2002-12-01) (MULTIMEDIA
’02). Association for Computing Machinery, 235–238. doi:10.1145/641007.641053
[14] Lisa Graham, Julia Das, Rodrigo Vitorio, Claire McDonald, Richard Walker, Alan
Godfrey, Rosie Morris, and Samuel Stuart. 2023. Ocular microtremor: a structured
review. Experimental Brain Research 241, 9 (2023), 2191–2203.
[15] Cathal Gurrin, Alan F. Smeaton, and Aiden R. Doherty. 2014.
LifeLogging:
Personal Big Data. 8, 1 (2014), 1–125. doi:10.1561/1500000033
[16] Lei Han, Mingnan Wei, Qiongyan Chen, Anqi Wang, Rong Pang, Kefei Liu, Ron-
grong Chen, and David Yip. 2025. Eye2Recall: Exploring the Design of Enhancing
Reminiscence Activities via Eye Tracking-Based LLM-Powered Interaction Expe-
rience for Older Adults. arXiv:2508.02232 [cs] doi:10.48550/arXiv.2508.02232
[17] Dan Witzner Hansen and Qiang Ji. 2003. Eye tracking in human-computer
interaction. Computer Vision and Image Understanding 98, 1 (2003), 1–25.
[18] Sandra G Hart and Lowell E Staveland. 1988. Development of NASA-TLX (Task
Load Index): Results of empirical and theoretical research. In Advances in psy-
chology. Vol. 52. Elsevier, 139–183.
[19] Anthony J. Hornof and Anna Cavender. 2005. EyeDraw: enabling children with
severe motor impairments to draw with their eyes. In Proceedings of the SIGCHI
Conference on Human Factors in Computing Systems (Portland Oregon USA, 2005-
04-02). ACM, 161–170. doi:10.1145/1054972.1054995
[20] Qinghao Huang, Fan Wang, and Hongsheng Li. 2020. Deep sketch-based image
retrieval. In Proceedings of the IEEE/CVF Conference on Computer Vision and
Pattern Recognition (CVPR).
[21] Robert J. K. Jacob. 1991. The use of eye movements in human-computer in-
teraction techniques: what you look at is what you get. 9, 2 (1991), 152–169.
doi:10.1145/123078.128728
[22] Roger Johansson, Marcus Nyström, Richard Dewhurst, and Mikael Johansson.
2022. Eye-movement replay supports episodic remembering. 289, 1977 (2022),
20220964. doi:10.1098/rspb.2022.0964 Publisher: Royal Society.
[23] Yaxiong Lei, Shijing He, Mohamed Khamis, and Juan Ye. 2023. An End-to-End
Review of Gaze Estimation and its Interactive Applications on Handheld Mobile
Devices. Comput. Surveys 56, 2 (Sept. 2023), 1–38. doi:10.1145/3606947
[24] Jiahao Nick Li, Zhuohao Jerry Zhang, and Jiaju Ma. 2025. OmniQuery: Contex-
tually Augmenting Captured Multimodal Memory to Enable Personal Question
Answering. arXiv:2409.08250 [cs] doi:10.48550/arXiv.2409.08250
[25] Päivi Majaranta and Andreas Bulling. 2014. Eye tracking and eye-based human–
computer interaction. In Advances in physiological computing. Springer, 39–65.
[26] Natasha Maniar, Samantha W. T. Chan, Wazeer Zulfikar, Scott Ren, Christine
Xu, and Pattie Maes. 2025. MemPal: Leveraging Multimodal AI and LLMs for
Voice-Activated Object Retrieval in Homes of Older Adults. arXiv:2502.01801
[cs] doi:10.48550/arXiv.2502.01801


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Zufikar and Samaradivakara, et al.
[27] David F Marks. 1973. Vividness of visual imagery Questionnaire. Journal of
Mental Imagery (1973).
[28] Susana Martinez-Conde, Jorge Otero-Millan, and Stephen L. Macknik. 2013. The
impact of microsaccades on vision: towards a unified theory of saccadic function.
14, 2 (2013), 83–96. doi:10.1038/nrn3405
[29] Somang Paeng and Hyoung F. Kim. 2024. Gaze patterns reflect the retrieval and
selection of memories in a context-dependent object location retrieval task. 14,
1 (2024), 9433. doi:10.1038/s41598-024-59815-9 Publisher: Nature Publishing
Group.
[30] Alexandra Papoutsaki, James Laskey, and Jeff Huang. 2017. Searchgazer: Webcam
eye tracking for remote studies of web search. In Proceedings of the 2017 conference
on conference human information interaction and retrieval. 17–26.
[31] Ken Pfeuffer, Benedikt Mayer, Diako Mardanbegi, and Hans Gellersen. 2017.
Gaze + pinch interaction in virtual reality. In Proceedings of the 5th Symposium
on Spatial User Interaction (Brighton United Kingdom, 2017-10-16). ACM, 99–108.
doi:10.1145/3131277.3132180
[32] Pupil Labs GmbH. 2026. Pupil Labs Neon: Eye tracking for research and beyond.
https://pupil-labs.com/products/neon. Accessed: 2026-01-20.
[33] Keith Rayner, Tim J. Smith, George L. Malcolm, and John M. Henderson. 2009.
Eye Movements and Visual Encoding During Scene Perception. 20, 1 (2009), 6–10.
doi:10.1111/j.1467-9280.2008.02243.x
[34] Jennifer D Ryan and Kelly Shen. 2020. The eyes are a window into memory. 32
(2020), 1–6. doi:10.1016/j.cobeha.2019.12.014
[35] Takumi Toyama, Thomas Kieninger, Faisal Shafait, and Andreas Dengel. 2012.
Gaze guided object recognition using a head-mounted eye tracker. In Proceedings
of the Symposium on Eye Tracking Research and Applications (Santa Barbara
California, 2012-03-28). ACM, 91–98. doi:10.1145/2168556.2168570
[36] Mélodie Vidal, Andreas Bulling, and Hans Gellersen. 2015. Pursuits: Spontaneous
Eye-Based Interaction for Dynamic Interfaces. 18, 4 (2015), 8–10. doi:10.1145/
2721914.2721917
[37] Xi Wang, Andreas Ley, Sebastian Koch, David Lindlbauer, James Hays, Kenneth
Holmqvist, and Marc Alexa. 2019. The Mental Image Revealed by Gaze Tracking.
In Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems
(Glasgow, Scotland Uk) (CHI ’19). Association for Computing Machinery, New
York, NY, USA, 1–12. doi:10.1145/3290605.3300839
[38] Jordana S. Wynn, Zhong-Xu Liu, and Jennifer D. Ryan. 2022. Neural Correlates
of Subsequent Memory-Related Gaze Reinstatement. 34, 9 (2022), 1547–1562.
doi:10.1162/jocn_a_01761
[39] Wazeer Deen Zulfikar, Samantha Chan, and Pattie Maes. 2024. Memoro: Us-
ing large language models to realize a concise interface for real-time memory
augmentation. In Proceedings of the 2024 CHI Conference on Human Factors in
Computing Systems. 1–18.
A
Pre-Survey Results
Table 2: Participant Demographics and VVIQ Scores
Participant ID
Age
Gender
VVIQ Score
1
56.0
Female
70
2
22.0
Female
37
3
22.0
Female
38
4
21.0
Female
58
5
28.0
Male
58
6
27.0
Male
78
7
21.0
Female
53
8
20.0
Male
71
9
34.0
Male
55
10
21.0
Female
53
11
28.0
Male
39
B
Post-Survey Results
C
Detailed Algorithmic and Implementation
This appendix provides additional technical details and rationale
for the gaze-based retrieval algorithm described in the main paper.
Table 3: Post-Study Survey Results
Measure
M
SD
NASA-TLX (Raw, 1-21)
8.26
2.50
TAM (Overall) (1-5)
3.48
0.82
TAM (Percieved Usefulness) (1-5)
3.58
0.81
TAM (Percieved Ease of Use) (1-5)
3.38
0.97
Figure 5: Per-participant Top-1 retrieval accuracy within each
category
The goal is to support reproducibility and clarify design choices
that were abstracted in the main text for brevity.
Fixation Representation and Preprocessing
Each eye-tracking trial is represented as a temporally ordered se-
quence of fixations
𝐹= {(𝑥𝑖,𝑦𝑖,𝑑𝑖)}𝑁
𝑖=1,
where (𝑥𝑖,𝑦𝑖) denotes the fixation location in screen coordinates
and 𝑑𝑖denotes fixation duration. Fixations and saccades were ex-
tracted using the Pupil Labs Neon processing pipeline, which ap-
plies established velocity- and dispersion-based criteria to raw gaze
samples. Only fixation events were used in the retrieval algorithm.
Fixations were sorted by timestamp to preserve temporal order.
Trials with missing or invalid gaze samples were excluded during
preprocessing. If fewer than 𝐾fixations were present in a trial, all
available fixations were used when constructing prefix maps.
Attentional Map Construction
Fixations were projected onto a discrete screen-space grid corre-
sponding to the display resolution used during the experiment. Each
fixation contributed a duration-weighted impulse at its location,
which was subsequently smoothed using an isotropic Gaussian
kernel with standard deviation 𝜎:
𝐻(𝑥,𝑦) =
𝑁
∑︁
𝑖=1
𝑑𝑖· N  (𝑥,𝑦); (𝑥𝑖,𝑦𝑖), 𝜎2𝐼.
Gaussian smoothing serves two purposes: (1) it introduces spatial
tolerance to account for small inaccuracies in eye-tracking mea-
surements and recall variability, and (2) it produces a continuous
attentional distribution that emphasizes regions of sustained atten-
tion rather than isolated fixation points. The resulting map was


---

Mnemonic Tracing
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Table 4: Participant Feedback and NASA-TLX Scores
Participant
NASA-TLX
TAM
Intentional
Eye Movement
ID
(Raw)
Score
Eye Movement
Helped
1
7.83
3.12
Strongly Agree
Neutral
2
11.67
1.75
Disagree
Disagree
3
7.00
2.62
Agree
Disagree
4
11.50
3.75
Agree
Strongly Agree
5
5.83
4.25
Strongly Agree
Strongly Agree
6
6.00
4.38
Strongly Agree
Agree
7
12.17
3.50
Strongly Agree
Agree
8
10.50
3.88
Agree
Strongly Agree
9
6.33
3.50
Agree
Disagree
10
6.33
4.50
Agree
Agree
11
8.17
2.62
Strongly Agree
Strongly Agree
P1
P2
P3
P4
P5
P6
P7
P8
P9
P10
P11
Top-1 (%)
36.7
19.0
21.7
27.6
17.2
40.0
33.3
33.3
32.1
26.7
50.0
Top-3 (%)
50.0
47.6
56.5
44.8
34.5
66.7
59.3
60.0
50.0
40.0
55.6
Top-5 (%)
63.3
57.1
65.2
48.3
41.4
70.0
70.4
66.7
60.7
56.7
61.1
Overall (%)
Top-1: 30.5
Top-3: 51.2
Top-5: 60.0
Chance (%)
Top-1: 3.3
Top-3: 10.0
Top-5: 16.7
Table 5: Per-participant retrieval accuracy across all categories. Chance performance assumes uniform random selection from
a 30-image candidate set.
Gaussian Attentional Map Retrieval
EMD
Subject
Top-1
Top-3
Top-5
Top-1
Top-3
Top-5
P1
36.7
50.0
63.3
10.3
20.7
37.9
P2
19.0
47.6
57.1
14.3
42.9
57.1
P3
21.7
56.5
65.2
22.2
44.4
59.3
P4
27.6
44.8
48.3
26.7
40.0
60.0
P5
17.2
34.5
41.4
10.0
20.0
30.0
P6
40.0
66.7
70.0
33.3
50.0
66.7
P7
33.3
59.3
70.4
22.2
44.4
59.3
P8
33.3
60.0
66.7
26.7
50.0
63.3
P9
32.1
50.0
60.7
28.6
50.0
53.6
P10
26.7
40.0
56.7
26.7
50.0
63.3
P11
50.0
55.6
61.1
33.3
50.0
66.7
Mean
30.5
51.2
60.0
24.7
42.3
54.5
Table 6: Comparison of retrieval accuracy (%) between the proposed Gaussian Attentional Map Retrieval (GAMR) method and
an Earth Mover’s Distance (EMD), reported per subject and averaged across subjects.
normalized to sum to one, yielding a probability distribution over
visual attention.
Prefix-Based Attentional Maps
To capture early attentional structure, which may reflect coarse
scene layout and globally salient regions, prefix attentional maps
were constructed using only the first 𝐾fixations in the temporally
ordered sequence:
𝐻(𝐾) (𝑥,𝑦) =
𝐾
∑︁
𝑖=1
𝑑𝑖· N  (𝑥,𝑦); (𝑥𝑖,𝑦𝑖), 𝜎2𝐼,
followed by normalization. This design is motivated by prior find-
ings that early fixations often encode high-level spatial structure
and may be preferentially reinstated during recall, even when later
fixation order varies.


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Zufikar and Samaradivakara, et al.
Participant
Top-1 (%)
P1
56.7
P2
42.9
P3
47.8
P4
48.3
P5
41.4
P6
66.7
P7
55.6
P8
56.7
P9
50.0
P10
53.3
P11
66.7
Overall
53.2
Chance
16.7
Table 7: Within-set (6-way) Top-1 retrieval accuracy using
the gaze-based retrieval algorithm. Chance performance cor-
responds to uniform random selection from six items (16.7%).
Similarity Metric
Similarity between encoding and retrieval attentional maps was
computed using the Bhattacharyya coefficient:
BC(𝐻𝑒, 𝐻𝑟) =
∑︁
𝑥,𝑦
√︁
𝐻𝑒(𝑥,𝑦) 𝐻𝑟(𝑥,𝑦).
The Bhattacharyya coefficient was chosen because it is symmet-
ric, bounded, and robust to differences in overall fixation density.
Unlike divergence-based measures (e.g., KL divergence), it does
not require strict distributional assumptions and is less sensitive
to sparse regions with near-zero probability. Alternative similarity
measures (e.g., cosine similarity, histogram intersection) were ex-
plored in pilot experiments but produced less stable performance
across participants.
Combined Similarity and Ranking
Final similarity between an encoding trial 𝑒and a retrieval trial
𝑟was computed as a weighted combination of prefix-based and
full-trial similarity:
𝑆(𝑒,𝑟) = 𝛼BC 𝐻(𝐾)
𝑒
, 𝐻(𝐾)
𝑟
 + (1 −𝛼) BC 𝐻𝑒, 𝐻𝑟
.
Encoding trials were ranked by decreasing 𝑆(𝑒,𝑟), and retrieval
performance was evaluated using Top-𝑘accuracy.
Parameter Selection
The parameters 𝜎= 30 pixels, 𝐾= 12, and 𝛼= 0.7 were selected
based on internal validation experiments. These values were chosen
to balance spatial robustness, early attentional structure, and overall
retrieval stability across participants. Performance was qualitatively
stable across a moderate range of parameter values, with these
settings yielding the most consistent results.
D
Additional Technical Results
E
Instructions to Participant
Overview
In this study, you will view a series of images (objects, people, or
locations). After viewing, you will recall them while looking at a
blank screen. There will be 6 sets of 5 images each. In each set, you
will go through three parts: viewing, recalling, and experiencing.
Part 1: Viewing
• A cue (e.g., “A person with a coffee mug in hand”) will tell
you what image you will see next.
• Use the cue to remember the image.
• While viewing, please pay attention to the details and unique
characteristics of the image.
• As you try to remember the image, be mindful of your eye
movements—where your gaze goes, what you focus on, and
how you scan the scene.
After viewing the images within that set, you will move on to the
recalling part.
Part 2: Recalling
• You will be shown the same cue again.
• First, take a moment to internally visualize the exact de-
tails of the image linked with that cue. Then press Begin
Retrieval.
• You will see a blank screen for 7 seconds.
• During these 7 seconds, project the mental image onto
the blank screen by freely moving your eyes while tracing
the details you remember.
• Be very mindful of your eye movements as you recall—
use your gaze intentionally to reconstruct the image. Use
the entire screen to trace the image details with your
eyes.
This will happen sequentially for all 5 images in that set.
Part 3: Experiencing
• After recalling, you will have the opportunity to “experience”
the gaze recall method.
• Choose one image from the set that you just saw that you
would want to recall. Do not say it out loud.
• When you have it in your mind, press Begin.
• During the 7-second blank screen, project the “mental image”
onto the screen by freely moving your eyes while tracing
the details you remember.
• Be very mindful of your eye movements—use your gaze
intentionally and use the entire screen to trace the image
details.
You only do this part once per set.
Important Notes
• Please keep your head as still as possible using the headrest
during the entire study.
• Keep your eyes open during recall and experience phases.


---

Mnemonic Tracing
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Figure 6: Example of stimulus used with their cues
Figure 7: A participant using the experimental setup, wear-
ing eye-tracking glasses while viewing images on a desktop
display during the study.
F
Stimulus Examples
G
Study Environment
