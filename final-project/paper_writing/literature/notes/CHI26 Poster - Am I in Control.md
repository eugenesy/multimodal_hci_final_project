Am I in Control? How the Design of the TikTok Feed Shapes
Users’ Sense of Agency
Alberto Monge Roffarello
Dipartimento di Automatica e Informatica
Politecnico di Torino
Torino, Italy
alberto.monge@polito.it
Andrea De Luca
Dipartimento di Automatica e Informatica
Politecnico di Torino
Torino, Italy
s323990@studenti.polito.it
Abstract
Social media platforms increasingly rely on Attention-Capture Dam-
aging Patterns (ACDPs) optimized to maximize user engagement,
often at the expense of users’ Sense of Agency (SoA) and perceived
control. This paper preliminarily investigates how two core ACDPs
in TikTok—namely infinite scroll and content autoplay—shape
users’ SoA at both reflective and experiential levels. By manipulat-
ing these patterns and replacing them with small design changes,
we conducted a controlled laboratory study in which agency was
assessed through self-report measures, interaction logs, and tem-
poral estimation tasks as a proxy for experiential agency. Results
indicate that replacing autoplay with explicit playback significantly
increases perceived agency and reduces time distortion. In contrast,
paginated scrolling produced more subtle quantitative effects, but
emerged as the solution most favored by participants. Together,
these findings suggest that small feed-level design changes can
meaningfully support users’ SoA, while also revealing a tension
between intervention effectiveness and perceived intrusiveness.
CCS Concepts
• Human-centered computing →Empirical studies in collab-
orative and social computing; Social media.
Keywords
sense of agency, digital wellbeing, TikTok, attention-capture design
ACM Reference Format:
Alberto Monge Roffarello and Andrea De Luca. 2026. Am I in Control? How
the Design of the TikTok Feed Shapes Users’ Sense of Agency. In Extended
Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems
(CHI EA ’26), April 13–17, 2026, Barcelona, Spain. ACM, New York, NY, USA,
5 pages. https://doi.org/10.1145/3772363.3798790
1
Introduction
Social media platforms operate within an attention economy in
which interface design decisions are optimized to maximize time-
on-platform and interaction frequency, often at the expense of users’
ability to disengage when they intend to do so [17, 18]. Prior work
has framed these design decisions through the lens of dark patterns
This work is licensed under a Creative Commons Attribution-NonCommercial-
NoDerivatives 4.0 International License.
CHI EA ’26, Barcelona, Spain
© 2026 Copyright held by the owner/author(s).
ACM ISBN 979-8-4007-2281-3/26/04
https://doi.org/10.1145/3772363.3798790
[10], identifying Attention-Capture Damaging Patterns (ACDPs)—
such as infinite scroll and content autoplay—that transform social
media feeds into “always-on” consumption loops that undermine
users’ digital wellbeing [18].
Despite growing concern around these patterns, much public and
academic discussions of problematic social media use still frequently
default to a single, simple target: reducing screen time. However, the
HCI community increasingly recognizes that the core question is
not simply how long people use social media, but what happens
to them while they use it, and how specific design decisions shape
those experiences [7, 13]. Within this shift, Sense of Agency (SoA)—
the feeling of control over one’s actions and their outcomes—has
emerged as a promising lens for understanding digital wellbeing [3].
However, while prior work has begun to empirically examine how
specific social media design mechanisms relate to users’ sense of
control and agency [2, 14], evidence on how these designs shape
the in-the-moment experiential dimension of SoA remains limited.
This work takes a first step toward addressing this gap by ex-
perimentally examining how small changes to social media feed
design affect users’ SoA at both reflective and experiential levels.
Using TikTok as a case study, we developed a browser extension
that enables controlled modifications of two foundational ACDPs
embedded in the “For You” feed: infinite scroll and content autoplay.
We conducted a controlled laboratory study using a 2 × 2 within-
subjects design, manipulating (1) Scrolling Mode (Infinite Scroll
vs. Paginated Scroll) and (2) Playback Mode (Autoplay vs. Explicit
Play). To capture different facets of agency, we combined self-report
measures, interaction logs, and temporal estimation tasks.
Our findings provide initial evidence that feed-level design changes
targeting common ACDPs are associated with measurable differ-
ences in users’ perceived SoA. Replacing autoplay with explicit
play led to a significant increase in self-reported agency, while
replacing infinite scroll with paginated scroll produced more subtle
effects: while participants reported increased control, these effects
were not statistically robust in our laboratory setting. At an expe-
riential level, users consistently overestimated how long they had
been scrolling in the baseline TikTok condition, whereas this tem-
poral distortion was attenuated when ACDPs were replaced with
alternative designs. Together, these results suggest that feed-level
design patterns shape not only how long users engage, but how
much control they feel while doing so. Interestingly, participants
described paginated scroll as a gentler and more acceptable inter-
vention than explicit play, highlighting a practical tension between
effectiveness and perceived intrusiveness. We conclude by outlining
how this preliminary work contributes early empirical evidence on
how feed-level design patterns relate to agency-related outcomes,


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Alberto Monge Roffarello and Andrea De Luca
while motivating future in-the-wild studies aimed at disentangling
pattern-specific effects from interaction friction and context.
2
Related Work
A dominant framing in both academic discourse and industry prac-
tice has equated digital wellbeing on social media with reduced
screen time [12]. In response, a wide range of digital self-control
tools have been proposed [16], including operating-system-level
features such as Apple’s Screen Time [1] and Google’s Digital Well-
being [9]. These tools primarily rely on monitoring and limiting
time spent on social media, often through usage timers or locks [16].
Despite its popularity, this time-based approach has been increas-
ingly criticized. Researchers now argue that screen-time metrics
fail to capture the qualitative dimensions of social media use [13],
overlook the deeper psychosocial mechanisms underlying problem-
atic engagement [8], and ignore contexts in which engagement is
intentional and valuable [15].
In response, recent research has proposed Sense of Agency
(SoA)—the subjective experience of being in control of one’s actions
and their outcomes [3]—as a more appropriate lens for understand-
ing digital wellbeing than screen time alone [13, 14], arguing that
agency more directly captures users’ lived experience during inter-
action.
In parallel, the HCI community has increasingly emphasized
the role of interface design in shaping problematic patterns of en-
gagement [11], extending earlier discussions of dark patterns and
manipulative design [10] to the context of social media. Monge
Roffarello et al. [20] introduced the concept of Attention-Capture
Damaging Patterns (ACDPs), providing a taxonomy of recurring
design strategies that exploit psychological vulnerabilities to pro-
long engagement on social media. Similarly, Mildner et al. [17]
identified unethical design practices in social networks that aim to
keep users continuously engaged (“engaging strategies”) while sub-
tly shaping their decision-making (“governing strategies”). Among
these design strategies, two of them are particularly relevant for
social media newsfeeds: infinite scroll and content autoplay. Infinite
scroll removes natural stopping cues by continuously loading new
content, reducing opportunities for reflection [20]. Content auto-
play, instead, further reduces friction by automatically advancing
content without requiring explicit user input [20].
While there is growing agreement that ACDPs can undermine
users’ SoA [14, 21], much of this evidence is grounded in reflective
judgments [13], relying on post-hoc self-reports. Psychological re-
search, however, suggests that reflective judgments do not always
align with in-the-moment experiential feelings [22]. The present
study examines both reflective and experiential aspects of agency
on social media, investigating how small design changes on TikTok
shape these experiences.
3
TikTok Research Panel
To study how feed-level design changes targeting ACDP-related
interaction mechanics shape users’ SoA on TikTok, we developed a
Google Chrome extension named TikTok Research Panel (Figure 1).
We focused on the web version of TikTok, as directly modifying
native mobile applications poses substantial technical barriers and
is often impractical in research contexts [18]. Using the web version
allowed participants to log in with their personal accounts and thus
experience their usual recommendation ecosystem during the study.
The extension currently targets two of the most prominent
ACDPs embedded in the TikTok feed—namely content autoplay
and infinite scroll—by allowing them to be replaced with two alter-
native design choices that have been previously associated with
improved digital wellbeing: click-to-play [21] and load more [19],
respectively.
When click-to-play is active, TikTok reels are paused by default
and require an explicit user action to begin playback (Figure 1B).
When load more is active, the feed is interrupted after a fixed number
of videos and requires an explicit decision to continue scrolling
(Figure 1C).
Through its graphical control panel (Figure 1A), the extension
allows the researcher to selectively activate the two design alter-
natives, start and stop logging TikTok usage data, and export in-
teraction logs at the end of each experimental session. The source
code of the TikTok Research Panel is publicly available at: https:
//git.elite.polito.it/public-projects/tiktok_agency.
4
Experiment Methodology
Leveraging TikTok Research Panel, we conducted a controlled lab-
oratory study involving 20 participants.
4.1
Metrics
In line with SoA research work in other domains [6], we aimed to
capture both participants’ reflective judgments of agency and their
pre-reflective experiential feelings.
To assess judgments of agency, we used the Sense of Agency Scale
(SoAS) [24], an 11-item self-report questionnaire measuring both
positive and negative agency. To approximate feelings of agency, we
relied on a measure of temporal distortion, defined as the difference
between the duration of a usage session perceived by the user
and its actual duration. Temporal distortion has been consistently
associated with reduced in-the-moment awareness and diminished
experiential agency during interaction [4].
Beyond agency-related subjective measures, we used the logging
features of the TikTok Research Panel to record the mean inter-
val between scrolls (in seconds), which we treat as an objective
indicator of interaction rhythm.
4.2
Procedure
The experiment was conducted using the web version of TikTok
on a tablet device to approximate the mobile-oriented experience
of TikTok consumption. Each session lasted approximately 45–60
minutes in total and was structured as follows.
Upon arrival, participants signed an informed consent form ap-
proved by the Institutional Review Board of our university. Then,
they logged into their TikTok account on the tablet device used for
the study and completed four experimental conditions in a fully
counterbalanced order: (a) baseline (standard TikTok interface with
infinite scroll and autoplay); (b) paginated scrolling (infinite scroll is
replaced by load more); (c) explicit playback (autoplay is replaced by
click-to-play); and (d) full control (both load more and click-to-play
are active).


---

Am I in Control? How the Design of the TikTok Feed Shapes Users’ Sense of Agency
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Figure 1: Implementation of the TikTok Research Panel Chrome extension. Through a control panel (A), the extension allows
the researcher to replace content autoplay with click-to-play (B) and infinite scroll with load more (C).
For each condition, participants freely navigated their TikTok
feed, and were interrupted by the researcher after a randomized
duration between 4 and 12 minutes. At the end of each session,
participants estimated the duration of the session, and completed a
post-condition questionnaire with the SoAS.
After completing all four conditions, participants took part in a
debriefing session during which the full purpose of the study was
explained, and they were asked about their overall impressions of
and preferences among the tested TikTok versions.
4.3
Participants
Participants were recruited through an online screening question-
naire distributed via university-related messaging groups (e.g., Tele-
gram, WhatsApp) and through a snowball sampling process. Par-
ticipants were required to (a) be at least 18 years old; (b) own a
personal TikTok account; (c) have been registered on TikTok for
more than three months; (d) report a period of regular TikTok use
of at least 3–4 months (defined as at least a few times per week);
and (e) either currently use TikTok or have stopped using it within
the previous six months.
Overall, 20 participants took part in the laboratory study. The
final sample was balanced by gender (10 women, 10 men) and
had a mean age of 24.4 years (SD = 1.9, range = 21–28). Fifteen
participants (75%) were active TikTok users at the time of the study,
while the remaining 5 (25%) had stopped using the platform within
the previous six months, still satisfying the inclusion criteria. The
inclusion of recent former users was intentional, as individuals
who discontinued TikTok use may have done so due to perceived
loss of control, making their perspective particularly relevant for
investigating the impact of design patterns on SoA.
5
Results
Table 1 summarizes our results in terms of reflective judgments of
agency (SoAS), experiential feelings of agency (temporal distortion),
and interaction rhythm.
At the reflective level, participants reported higher perceived
SoA when using redesigned versions of the TikTok feed, although
effects varied in statistical significance. In the baseline condition, the
average SoA score was 𝑀= 4.56 (𝑆𝐷= 0.99). Paginated scrolling led
to a small increase in SoA (𝑀= 4.75, 𝑆𝐷= 0.94), but this difference
was not statistically significant (paired 𝑡-test, 𝑝= .222). In contrast,
SoA was significantly higher than baseline when autoplay was
replaced with click-to-play (explicit playback, 𝑀= 5.25, 𝑆𝐷= 0.81,
𝑝< .001) and when both load more and click-to-play were enabled
(full control, 𝑀= 5.20, 𝑆𝐷= 1.01, 𝑝< .01).
At the experiential level, the collected data were highly skewed,
although some clear high-level patterns emerged. In particular,
temporal distortion decreased relative to the baseline condition
(𝑀= 270.70𝑠, 𝑆𝐷= 259.58𝑠) when autoplay was replaced with
click-to-play (explicit playback, 𝑀= 199.65𝑠, 𝑆𝐷= 338.75𝑠) and
when both interventions were active (full control, 𝑀= 187.10𝑠,
𝑆𝐷= 179.89𝑠). In contrast, no comparable reduction was observed
in the paginated scrolling condition. Notably, temporal distortion re-
mained positive both at the individual level and on average across
all conditions, indicating that participants consistently overesti-
mated the duration of their TikTok usage sessions.
Beyond agency, the analysis of interaction rhythm revealed a
slight increase in the mean scrolling interval from the baseline
condition (𝑀= 15.39𝑠, 𝑆𝐷= 7.07𝑠) to full control (𝑀= 17.87𝑠,
𝑆𝐷= 8.89𝑠), suggesting that, in the absence of ACDPs, participants
scrolled more slowly. However, a series of paired 𝑡-tests did not
reveal statistically significant differences.
After experiencing all four interface versions, participants ex-
pressed clear preferences in the debriefing and offered explanations
that shed light on the practical viability of the implemented design


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Alberto Monge Roffarello and Andrea De Luca
Table 1: Summary of experimental results in terms of reflective judgments of agency (measured using the SoAS), experiential
feelings of agency (approximated via temporal distortion), and interaction rhythm (mean interval between scrolls).
Condition
SoAS
Temporal distortion (s)
Interaction rhythm (s)
(a) baseline
4.56 (SD = 0.99)
270.70 (SD = 259.58)
15.39 (SD = 7.07)
(b) paginated scrolling
↑4.75 (SD = 0.94)
276.85 (SD = 283.32)
↓17.10 (SD = 11.00)
(c) explicit play
↑5.25 (SD = 0.81)
↓199.65 (SD = 338.75)
↓17.20 (SD = 8.03)
(d) full control
↑5.20 (SD = 1.01)
↓187.10 (SD = 179.89)
↓17.87 (SD = 8.89)
changes. We found that the most effective design for increasing
control (explicit play) was not the most preferred, whereas a less
disruptive design (paginated scrolling) was widely liked despite
its weaker quantitative impact. Specifically, participants pointed
out that becoming absorbed in TikTok is sometimes precisely their
goal; consequently, requiring an explicit tap to play each reel would
significantly disrupt their flow. As one participant (P8) explained:
“When I enter the platform, I do so to let myself be carried along.
A heavy friction like disabling autoplay would make it more frus-
trating. Pagination, on the other hand, is not very annoying but
slightly increases awareness of the time spent.” This highlights an
important tension between convenience and user experience over
user empowerment.
6
Discussions and Future Works
Our preliminary study provides initial evidence that relatively small
changes to the TikTok newsfeed can influence users’ SOA at both
reflective and experiential levels. At the same time, it highlights
open challenges that are guiding our plans to extend this line of
work.
First, our results do not allow us to isolate the specific contri-
bution of individual ACDPs to the effects measured in the study.
Although the replacement of autoplay with explicit play appeared
to yield stronger effects than the replacement of infinite scrolling
with paginated scrolling, this difference should be interpreted with
caution due to the small, homogeneous sample size. Furthermore,
rather than reflecting the intrinsic impact of a specific pattern, our
results may be mediated by the amount and nature of friction in-
troduced by the alternative design. Further studies with larger and
more diverse populations are therefore needed to disentangle the
relative roles of pattern type, interaction friction, and contextual
factors in shaping users’ sense of agency and time awareness.
This limitation is closely related to the challenge of operationaliz-
ing agency in highly continuous interaction contexts such as social
media feeds. Implicit measures such as temporal binding [5], which
assess the perceived temporal compression between an intentional
action and its outcome, have been widely used to capture feel-
ings of agency in tightly controlled action–outcome paradigms [6].
However, social media consumption is characterized by continuous
interaction and algorithmic mediation, making it difficult to isolate
discrete action–outcome pairs. As a result, we employed a temporal
estimation task. Although distortions in perceived duration have
been associated with phenomena such as normative dissociation [4],
in which deep absorption is accompanied by reduced experiential
agency, perceived time distortion should be interpreted as an ap-
proximation of the experiential dimension of agency rather than
as a direct measure of action–outcome binding. Our future work
will extend the study presented here by incorporating additional
analytical lenses, including validated measures of normative dis-
sociation [2], to further clarify how agency is shaped within the
continuous interaction dynamics of social media newsfeeds.
Interpreting temporal distortion in this context also requires sit-
uating our findings within the broader literature on flow and time
perception. Flow research typically shows that enjoyable, highly
engaging tasks lead to an underestimation of duration [23], fram-
ing temporal distortion as the experience of “time flying by” due
to deep absorption. Consistent with recent findings on TikTok
use [25], however, our participants tended to overestimate session
duration. This pattern suggests that short-form video consump-
tion may be less characterized by a state of flow and more by a
cognitively busy or fragmented experience, likely driven by the
rapid succession of heterogeneous content, with users exposed
to dozens of videos on unrelated topics within a single session.
Notably, some design interventions—particularly the requirement
for explicit play—showed promise in mitigating this upward time
distortion.
Finally, it is important to note that reduced agency is not inher-
ently problematic. In moderate forms and in specific contexts, users
might even seek out a dissociative experience as a form of relaxation
or escape. This complicates the design challenge: while reduced
agency entails potential regret later, in the moment it might be
exactly what the user desires. Our preliminary findings therefore
point toward the importance of designing for low-cost agency—
interventions that subtly support user control and awareness with-
out introducing excessive friction—highlighting opportunities for
rethinking social media newsfeeds in ways that respect both user
experience and autonomy.
7
Conclusions
This work suggests that restoring user agency on social media
may not require radical redesigns, but carefully calibrated shifts in
feed-level interaction mechanics.Participants’ preference for less
intrusive design changes points toward interventions that subtly
reintroduce moments of reflection without fully disrupting absorp-
tion, acknowledging that agency is not universally desired at all
times. Future research should therefore extend this work by dis-
entangling pattern-specific effects from interaction friction and
contextual factors. Doing so would enable a move beyond one-
size-fits-all solutions toward adaptive interfaces that dynamically
balance user control and convenience.
References
[1] Apple Inc. 2024. Use Screen Time on your iPhone or iPad. https://support.apple.


---

Am I in Control? How the Design of the TikTok Feed Shapes Users’ Sense of Agency
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
com/en-us/108806. Accessed: 2025-09-01.
[2] Amanda Baughan, Mingrui Ray Zhang, Raveena Rao, Kai Lukoff, Anastasia
Schaadhardt, Lisa D. Butler, and Alexis Hiniker. 2022. “I Don’t Even Remember
What I Read”: How Design Influences Dissociation on Social Media. In Proceedings
of the 2022 CHI Conference on Human Factors in Computing Systems (New Orleans,
LA, USA) (CHI ’22). Association for Computing Machinery, New York, NY, USA,
Article 18, 13 pages. doi:10.1145/3491102.3501899
[3] Khatereh Borhani, Brianna Beck, and Patrick Haggard. 2017. Choosing, Doing,
and Controlling: Implicit Sense of Agency Over Somatosensory Events. Psycho-
logical Science 28, 7 (2017), 882–893. doi:10.1177/0956797617697693 Epub 2017
May 10.
[4] Lisa D. Butler. 2006. Normative Dissociation. Psychiatric Clinics of North America
29, 1 (2006), 45–62. doi:10.1016/j.psc.2005.10.004 Dissociative Disorders: An
Expanding Window into the Psychobiology of the Mind.
[5] David Coyle, James Moore, Per Ola Kristensson, Paul Fletcher, and Alan Blackwell.
2012. I Did That! Measuring Users’ Experience of Agency in Their Own Actions.
In Proceedings of the SIGCHI Conference on Human Factors in Computing Systems
(Austin, Texas, USA) (CHI ’12). Association for Computing Machinery, New York,
NY, USA, 2025–2034. doi:10.1145/2207676.2208350
[6] Johanna K. Didion, Krzysztof Wolski, Dennis Wittchen, David Coyle, Thomas
Leimkühler, and Paul Strohmeier. 2024. Who did it? How User Agency is in-
fluenced by Visual Properties of Generated Images. In Proceedings of the 37th
Annual ACM Symposium on User Interface Software and Technology (Pittsburgh,
PA, USA) (UIST ’24). Association for Computing Machinery, New York, NY, USA,
Article 94, 17 pages. doi:10.1145/3654777.3676335
[7] Niall Docherty. 2021. Digital self-control and the neoliberalization of social
media well-being. International Journal of Communication 15 (2021), 3827–3846.
https://ijoc.org/index.php/ijoc/article/view/17721 Open Access.
[8] Niall Docherty and Asia J. Biega. 2022. (Re)Politicizing Digital Well-Being: Beyond
User Engagements. In Proceedings of the 2022 CHI Conference on Human Factors in
Computing Systems (New Orleans, LA, USA) (CHI ’22). Association for Computing
Machinery, New York, NY, USA, Article 573, 13 pages. doi:10.1145/3491102.
3501857
[9] Google. 2018. Our commitment to Digital Wellbeing. https://wellbeing.google/
vAccessed: 2025-09-01.
[10] Colin M. Gray, Yubo Kou, Bryan Battles, Joseph Hoggatt, and Austin L. Toombs.
2018. The Dark (Patterns) Side of UX Design. In Proceedings of the 2018 CHI
Conference on Human Factors in Computing Systems (Montreal QC, Canada)
(CHI ’18). Association for Computing Machinery, New York, NY, USA, 1–14.
doi:10.1145/3173574.3174108
[11] Longjie Guo, Yue Fu, Xiran Lin, Xuhai Xu, Yung-Ju Chang, and Alexis Hiniker.
2025. What Social Media Use Do People Regret? An Analysis of 34K Smartphone
Screenshots with Multimodal LLM. In Proceedings of the 2025 CHI Conference
on Human Factors in Computing Systems (CHI ’25). Association for Computing
Machinery, New York, NY, USA, Article 972, 23 pages. doi:10.1145/3706598.
3713724
[12] Simone Lanette, Phoebe K. Chua, Gillian Hayes, and Melissa Mazmanian. 2018.
How Much is ’Too Much’? The Role of a Smartphone Addiction Narrative in
Individuals’ Experience of Use. Proc. ACM Hum.-Comput. Interact. 2, CSCW,
Article 101 (Nov. 2018), 22 pages. doi:10.1145/3274370
[13] Kai Lukoff. 2022. Designing to Support Sense of Agency for Time Spent on Digital
Interfaces. Ph. D. Dissertation. University of Washington. http://hdl.handle.net/
1773/49196
[14] Kai Lukoff, Ulrik Lyngs, Himanshu Zade, J. Vera Liao, James Choi, Kaiyue Fan,
Sean A. Munson, and Alexis Hiniker. 2021. How the Design of YouTube Influences
User Sense of Agency. In Proceedings of the 2021 CHI Conference on Human Factors
in Computing Systems (Yokohama, Japan) (CHI ’21). Association for Computing
Machinery, New York, NY, USA, Article 368, 17 pages. doi:10.1145/3411764.
3445467
[15] Kai Lukoff, Cissy Yu, Julie Kientz, and Alexis Hiniker. 2018. What Makes Smart-
phone Use Meaningful or Meaningless? Proc. ACM Interact. Mob. Wearable
Ubiquitous Technol. 2, 1, Article 22 (March 2018), 26 pages. doi:10.1145/3191754
[16] Ulrik Lyngs, Kai Lukoff, Petr Slovak, Reuben Binns, Adam Slack, Michael Inzlicht,
Max Van Kleek, and Nigel Shadbolt. 2019. Self-Control in Cyberspace: Applying
Dual Systems Theory to a Review of Digital Self-Control Tools. In Proceedings
of the 2019 CHI Conference on Human Factors in Computing Systems (Glasgow,
Scotland Uk) (CHI ’19). Association for Computing Machinery, New York, NY,
USA, 1–18. doi:10.1145/3290605.3300361
[17] Thomas Mildner, Gian-Luca Savino, Philip R. Doyle, Benjamin R. Cowan, and
Rainer Malaka. 2023. About Engaging and Governing Strategies: A Thematic
Analysis of Dark Patterns in Social Networking Services. In Proceedings of the 2023
CHI Conference on Human Factors in Computing Systems (Hamburg, Germany)
(CHI ’23). Association for Computing Machinery, New York, NY, USA, Article
192, 15 pages. doi:10.1145/3544548.3580695
[18] Alberto Monge Roffarello and Luigi De Russis. 2023. Achieving Digital Wellbeing
Through Digital Self-control Tools: A Systematic Review and Meta-analysis. ACM
Trans. Comput.-Hum. Interact. 30, 4, Article 53 (Sept. 2023), 66 pages. doi:10.1145/
3571810
[19] Alberto Monge Roffarello, Luigi De Russis, and Kai Lukoff. 2025. The Digital
Attention Heuristics: Supporting the User’s Attention by Design. ACM Trans.
Comput.-Hum. Interact. 32, 4, Article 38 (Aug. 2025), 41 pages. doi:10.1145/3725215
[20] Alberto Monge Roffarello, Kai Lukoff, and Luigi De Russis. 2023. Defining
and Identifying Attention Capture Deceptive Designs in Digital Interfaces. In
Proceedings of the 2023 CHI Conference on Human Factors in Computing Systems
(Hamburg, Germany) (CHI ’23). Association for Computing Machinery, New York,
NY, USA, Article 194, 19 pages. doi:10.1145/3544548.3580729
[21] Brennan Schaffner, Yaretzi Ulloa, Riya Sahni, Jiatong Li, Ava Kim Cohen, Natasha
Messier, Lan Gao, and Marshini Chetty. 2025. An Experimental Study Of Netflix
Use and the Effects of Autoplay on Watching Behaviors. Proc. ACM Hum.-Comput.
Interact. 9, 2, Article CSCW030 (May 2025), 22 pages. doi:10.1145/3710928
[22] Matthis Synofzik, Gottfried Vosgerau, and Albert Newen. 2008. Beyond the
comparator model: A multifactorial two-step account of agency. Consciousness
and Cognition 17, 1 (2008), 219–239. doi:10.1016/j.concog.2007.03.010
[23] Wee-Kheng Tan, Po-Wei Lee, and Che-Wei Hsu. 2015. Investigation of temporal
dissociation and focused immersion as moderators of satisfaction–continuance
intention relationship: Smartphone as an example. Telematics and Informatics 32,
4 (2015), 745–754. doi:10.1016/j.tele.2015.03.007
[24] Adam Tapal, Ela Oren, Reuven Dar, and Baruch Eitam. 2017. The Sense of Agency
Scale: A Measure of Consciously Perceived Control over One’s Mind, Body, and
the Immediate Environment. Frontiers in Psychology Volume 8 - 2017 (2017).
doi:10.3389/fpsyg.2017.01552
[25] Yi Yang, Ru-De Liu, Yi Ding, Jingmin Lin, Zien Ding, and Xiantong Yang. 2024.
Time distortion for short-form video users. Computers in Human Behavior 151
(2024), 108009. doi:10.1016/j.chb.2023.108009
