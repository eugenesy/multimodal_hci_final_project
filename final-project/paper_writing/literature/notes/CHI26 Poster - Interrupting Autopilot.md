Interrupting Autopilot: Evaluating Sensory Interventions for
Momentary Self-Regulation
Dinithi Dissanayake
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
dinithi@ahlab.org
Muftee Mysan
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
Department of Electronic and
Telecommunication Engineering
University of Moratuwa
Moratuwa, Sri Lanka
muftee@ahlab.org
Yifei Luo
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
RWTH Aachen University
Aachen, Germany
yifei@ahlab.org
Timothy Antoni
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
e0196713@u.nus.edu
Peter Cleveland
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
petercleveland@nus.edu.sg
Prasanth Sasikumar
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
im_psk@nus.edu.sg
Suranga Nanayakkara
Augmented Human Lab, School of
Computing
National University of Singapore
Singapore, Singapore
suranga@ahlab.org
Peltier Module
(Heat/Cold)
Mini flat
vibration motor
ESP 32
Microcontroller
 Controls Peltier
polarity (heat/cold)
and vibration intensity
via L298 driver
Laptop
 Sends triggers and
controls intensity
12 V power
supply
Vibration
Audio
Hot
Cold
Sensory Interruptions
Neck
Ear
Body Locations
(a)
(b)
(c)
Figure 1: Overview of the sensory interruption system. (a) Sensory interruption modalities (vibrotactile, heat, cold, audio) and
body locations (behind the neck and behind the ear). (b) Hardware pipeline showing laptop-triggered control of vibrotactile
and thermal cues via a microcontroller. (c) Prototype deployment during a short-form video browsing task.
This work is licensed under a Creative Commons Attribution 4.0 International License.
CHI EA ’26, Barcelona, Spain
© 2026 Copyright held by the owner/author(s).
ACM ISBN 979-8-4007-2281-3/26/04
https://doi.org/10.1145/3772363.3798497
Abstract
People have different temptations and habitual behaviors they wish
to change, often imagining a better version of themselves. However,
most existing behavior-change interventions rely on conscious
self-regulation. Existing tools require users to notice a prompt,


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Dissanayake et al.
interpret it, and deliberately override an impulse, which is cog-
nitively demanding and prone to failure when behavior becomes
automatic. In this paper, we explore sensory interruptions as a way
to bridge perception, cognition, and behavior. These interruptions
aim to momentarily disrupt autopilot behavior and enable users
to regain control. We evaluated four sensory interruptions: vibro-
tactile, heat, cold, and audio, with 11 participants. Our findings
reveal clear subjective trade-offs: vibrotactile was often perceived
as habituated, while heat was effective but generally disliked due
to its punitive feel. Nevertheless, most interruptions produced a
brief micro-pause that prompted participants to reconsider their
behavior, highlighting the potential of physical modulation as a
complementary approach to self-regulation.
CCS Concepts
• Human-centered computing →Interaction devices; Inter-
action techniques.
Keywords
Subconscious Interrupt, Context Aware Nudging, Habit Forming,
Assistive Augmentation
ACM Reference Format:
Dinithi Dissanayake, Muftee Mysan, Yifei Luo, Timothy Antoni, Peter Cleve-
land, Prasanth Sasikumar, and Suranga Nanayakkara. 2026. Interrupting
Autopilot: Evaluating Sensory Interventions for Momentary Self-Regulation.
In Extended Abstracts of the 2026 CHI Conference on Human Factors in Com-
puting Systems (CHI EA ’26), April 13–17, 2026, Barcelona, Spain. ACM, New
York, NY, USA, 6 pages. https://doi.org/10.1145/3772363.3798497
1
Introduction
People often desire greater control over everyday habits and seek
to reduce behaviors they consider unhelpful. A common example
is mindless scrolling through short-form video content on a digital
device, often referred to as doomscrolling, in which continuous
reading and scrolling occur with little intentional control. Such
behaviors typically occur automatically and with minimal conscious
awareness. Consequently, self-regulation often relies on willpower
and conscious effort, which are known to be fragile and inconsistent
when confronting automatic, repetitive behaviors [2, 8, 22]. This
gap between intention and action remains a central challenge in
behavior change research [21, 24].
Many existing digital self-regulation tools rely on explicit nudges,
such as smartphone notifications or smartwatch vibrations [21, 24].
These approaches share a common assumption that users will notice
the cue and deliberately choose to act. However, this assumption
often fails when behavior is already automatic. Such nudges are
frequently ignored or quickly habituated to, particularly when
users are already engaged in what is often described as “autopilot”
behavior [3, 4]. This reveals a fundamental mismatch: interventions
that require deliberate attention struggle to interrupt behaviors
that bypass conscious awareness [2, 9, 16].
Therefore, how can interventions support self-regulation when
behavior is driven primarily by automatic processes rather than con-
scious decision-making? We propose shifting the point of interven-
tion from cognition to perception. Instead of relying on deliberate
attention, we explore whether habitual behavior can be interrupted
at a bodily level through brief sensory stimulation. We refer to this
approach as sensory interruption.
This approach is informed by two key insights from prior re-
search. First, situational interventions tend to be more effective than
cognitive strategies for addressing automatic behavior. Interrup-
tions embedded in the environment can reduce mindless behavior
by creating a brief pause, without requiring explicit instruction
or reflection [2, 9]. Second, the timing and mechanism of inter-
vention are critical. Interventions that explicitly draw attention to
decision-making can sometimes backfire, increasing rather than
reducing undesirable behavior [21]. From a self-control perspective,
attempting to actively inhibit an ongoing impulse is difficult and
often fails once automatic behavior has begun. Proactive strategies
that redirect attention before full engagement are therefore more
reliable [15].
Bodily sensations offer a promising mechanism for such early in-
tervention. By directly engaging perception, they may interrupt ha-
bitual engagement before conscious deliberation is required. A brief
sensation can produce a perceptual shift that naturally redirects
attention away from the habitual activity, creating an opportunity
for intentional choice.
To investigate this sensory interruption approach, we conducted
an exploratory study examining four types of sensory interruptions:
haptic, cold, heat, and audio. With the exception of audio, these sen-
sations were delivered at two body locations behind the neck and
behind the ear. These locations were selected for three reasons: (1)
their sensitivity to subtle stimulation [17, 20], (2) their minimal in-
terference with ongoing actions and task performance, and (3) their
feasibility for integration with emerging wearable technologies
such as smart glasses, which make detecting moments of habitual
engagement increasingly feasible. Our study examines participants’
observable reactions and subjective experiences, alongside objec-
tive measures such as reaction time and response speed following
interruption. In this paper, we focus our analysis on subjective
reports and qualitative observations, using objective measures as
supporting signals that we leave for deeper analysis in future work.
The goal of this pilot study is not to claim long-term behavior
change, but to provide early empirical insights into how differ-
ent sensory interruptions are perceived and how they influence
moment-to-moment disengagement from automatic behavior. By
characterizing both qualitative and quantitative responses, this
work lays the groundwork for future research on bodily-sensation-
based interventions that support intentional self-regulation.
2
Related Work
Doomscrolling as a Habit to Interrupt. Our motivation is to un-
derstand how habitual digital behaviors can be interrupted and
redirected toward healthier alternatives. We focus on doomscrolling,
which is the prolonged and automatic consumption of short-form
social media content, this behaviour has become increasingly com-
mon and difficult to regulate. Prior work characterizes such behav-
ior as highly immersive, with increased visual engagement and re-
duced disengagement, suggesting strong attentional capture [6, 12].
To study this phenomenon in a controlled setting, we asked partici-
pants to freely scroll through YouTube Shorts, using doomscrolling
as a representative habitual behavior.


---

Sensory Interruptions
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Bodily Sensations as Interruption Mechanisms. Most existing ap-
proaches to reducing problematic digital habits rely on explicit
notifications, screen-time tracking, or interface-level interventions,
which require conscious user attention and deliberate self-control [14,
18, 19, 21]. These approaches are often less effective once behavior
becomes automatic.
An alternative approach is to intervene through bodily sensa-
tions. Vibrotactile feedback has been widely explored for behavior
change, including posture correction and reducing sedentary be-
havior, but shares similarities with conventional notifications and
may be prone to habituation [5, 7, 10, 23]. Thermal feedback has
been studied primarily in safety and warning contexts, yet remains
underexplored as a mechanism for interrupting habitual digital
behavior. Cognitive research suggests that bodily sensations can
capture attention rapidly and preconsciously, creating brief oppor-
tunities to disrupt automatic behavior before effortful self-control is
required [2, 9]. We refer to this brief disruption as a micro-pause. In
this work, we compare vibrotactile, thermal, and audio cues to ex-
amine how different interruption modalities balance effectiveness,
comfort, and long-term usability.
3
Study Design and System Overview
We designed the study as a within-subject mixed-methods explo-
ration combining subjective reports, qualitative observations, and
objective sensing. The primary goal was to understand how dif-
ferent sensory interruptions are perceived and how they influence
moment-to-moment disengagement from habitual behaviors.
Sensory Interruption System. To deliver sensory interruptions,
we developed a custom actuation setup consisting of lightweight
wearable modules capable of producing thermal (heat and cold) and
vibrotactile stimulation, as well as audio cues delivered through ear-
phones. Thermal stimulation was achieved using Peltier elements,
where reversing the direction of current produced heating or cool-
ing, while vibrotactile feedback was provided through a compact
flat vibration motor. All components were controlled by a central
unit (laptop) responsible for triggering, synchronization, intensity
control, and timestamping of actuation events. Figure 1 provides an
overview of the study setup. The wearable modules were attached
to different body locations using medical-grade adhesive patches.
Procedure. Participants were first screened to ensure that exces-
sive short-form video consumption was a behavior they wished to
regulate. They then browsed YouTube Shorts on a laptop, selecting
content aligned with their personal interests to approximate natural
infinite scrolling behavior.
The wearable modules were attached to three body locations:
the wrist, behind the ear (mastoid region), and the back of the
neck (C7 vertebral area) [17]. The wrist was used as a baseline
location to calibrate individual tolerance levels for thermal stimu-
lation before applying sensations to more sensitive areas. Ear and
neck placements were counterbalanced across participants. Sensory
modalities (vibrotactile, heat, and cold) were randomized within
blocks to reduce ordering effects. All actuation events were logged
to support post-hoc analysis. Sensory interruptions were delivered
opportunistically during moments of high engagement (e.g., lean-
ing closer to the screen or visibly reacting to content), rather than
at fixed time intervals. Further details on the study protocol, hard-
ware implementation, and safety procedures are provided in the
supplementary materials.
All participants wore Aria glasses [11] during the session. This
served two purposes: (1) to collect objective measures such as head
movement and gaze for potential future analysis, and (2) to maintain
the ecological validity of wearing an assistive or sensing wearable
during everyday interaction. After each block of sensory interrup-
tions, participants completed a short questionnaire consisting of
three Likert-scale items (1–7), assessing noticeability, perceived
effectiveness in interrupting behavior, and willingness to use the
interruption in everyday life. Each participant experienced seven
interruption conditions in total, covering combinations of modal-
ity (audio, vibrotactile, heat, cold) and body location (neck, ear).
Following the completion of all conditions, we conducted a semi-
structured interview to gather qualitative feedback. Participants
were asked to reflect on their preferences across modalities and
locations, compare bodily interruptions to familiar audio or wrist-
based notifications, and discuss contexts in which they would or
would not want such a wearable to intervene. These interviews, to-
gether with in-situ observations, informed the qualitative analysis
reported in the following Section.
4
Preliminary Analysis and Discussion
We conducted the study with 11 participants (M=8, F=3), Six partic-
ipants reported already using active strategies to regulate doom-
scrolling, most commonly uninstalling or deleting applications, or
using third-party tools to track usage or impose time limits. Given
the small sample size (N=11) and the exploratory nature of the
study, we report descriptive statistics and visual trends rather than
inferential statistics. The goal of this analysis is not to establish
statistical significance, but to establish comparative patterns and
trade-offs across modalities and body placements that can inform
future design and hypothesis-driven work. We complement these
quantitative trends with qualitative data to help contextualize and
interpret participants’ responses.
Quantitative Analysis of the Subjective Ratings. Figure 2
summarizes participants’ subjective ratings across three dimen-
sions: noticeability, perceived interruption (reconsideration), and
everyday acceptability. Overall, the box plots show that most sen-
sory interruptions were clearly noticed, with median ratings above
the neutral midpoint across modalities and body locations. Haptic
and cold interruptions generally received higher median ratings
for everyday acceptability, while heat-based interruptions showed
greater variability and lower acceptability despite being rated as
effective for prompting reconsideration. Audio interruptions pro-
duced moderate ratings but exhibited overlap with familiar notifica-
tion patterns. Further to this, Figure 3 presents ratings aggregated
by cue modality. Consistent with the placement-specific results,
heat-based cues were rated as effective for behavioral reconsid-
eration but less suitable for everyday use, suggesting potential
concerns around comfort or long-term adoption. An analysis across
body placements (ear vs. neck) did not reveal substantial systematic
differences.
Qualitative Feedback and Observations.


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Dissanayake et al.
Figure 2: Participant ratings (median and interquartile range) for the everyday acceptability of each sensory interruption.
Colors indicate interruption modality (vibrotactile, cold, heat, audio); ear and neck locations are indicated in the labels.
Figure 3: Participant ratings comparing cue modalities (averaged across neck and ear placements, where applicable) across
three subjective evaluation measures.
Sensory interruptions reliably produce a brief “micro-pause,” even
during moments of high engagement. Across conditions, we ob-
served a consistent behavioral response to sensory interruptions.
Regardless of modality or placement, participants almost always
shifted their gaze away from the screen immediately following an
interruption. Interruptions were delivered opportunistically, timed
to moments when participants appeared highly engaged in the
content (e.g., leaning closer to the screen [1, 13] or laughing). In
these moments, the interruption reliably produced a brief disen-
gagement, suggesting the presence of a momentary “micro-pause”
in otherwise continuous, habitual interaction. In Figure 4 we pro-
vide a qualitative illustration of participants’ immediate reactions
to different sensory interruption modalities and body locations,
that foregrounds the subjective variability that complements our
quantitative analysis.
Effectiveness and user preference are distinct dimensions that can
diverge. Qualitative feedback revealed a consistent trade-off be-
tween interruptiveness and comfort across sensory interruptions.
Heat-based interruptions were frequently described as highly effec-
tive at immediately stopping doomscrolling behavior, often evoking
strong reactions such as discomfort or a sense of danger. Several
participants framed heat as punitive, noting that it forced disen-
gagement but would be undesirable for repeated everyday use (e.g.,
“it feels like a punishment” [P6] and “I want to stop it immediately”
[P4]). Importantly, participants distinguished between effectiveness
and preference as separate dimensions. For example, one partici-
pant noted, “I think the most effective is heat, but I prefer vibration...
heat makes me want to get rid of it” [P4]. In contrast, cold and haptic
sensations were generally perceived as more acceptable and less
aversive, even when their interruptive effect was described as more
gradual. This suggests that while strong aversive cues can reliably
disrupt behavior, they may reduce long-term acceptability.
Habituation reduces the effectiveness of familiar notification-based
cues over time. Audio and wrist-based vibrotactile were frequently
compared to familiar notifications (e.g., alarms or smartwatch alerts)
and described as easy to ignore due to habituation. This suggests
that habituation may shape the long-term effectiveness of differ-
ent interruption modalities: while some interruptions may become
more tolerable and less disruptive over time, others risk becom-
ing habits themselves and losing their interruptive power. These
observations point to the need for further investigation into how
interruptive cues perform over extended use.
Less cognitively mediated, bodily cues may interrupt behavior be-
fore conscious dismissal occurs. Several participants described heat
and cold sensations as operating at a more subconscious level,
prompting an immediate shift in attention without deliberate rea-
soning (e.g., “there was no thinking and I looked away” [P5]). Such
less cognitively mediated cues may therefore offer an alternative
pathway for disruption that is less susceptible to conscious dis-
missal. At the same time, participants highlighted the contextual


---

Sensory Interruptions
CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Cold
Ear
Hot
Vibration
Neck
Cold
Hot
Vibration
Audio
Figure 4: Representative participant facial reactions to dif-
ferent sensory interruption stimulated behind the ear and
the neck
nature of these sensations. For example, one participant noted that
preferences for heat or cold could depend on environmental condi-
tions, suggesting that the effectiveness and acceptability of thermal
interruptions may vary with situational context (e.g., weather or
ambient temperature).
Preferences for body location varied widely across participants.
The ear was often described as highly sensitive, whereas the neck
was perceived as effective but strongly context-dependent (e.g.,
uncomfortable when lying down [P4, P7]). Across participants, situ-
ational appropriateness played a key role in acceptance, reinforcing
the importance of designing sensory interruptions that are not only
perceptually distinct but also adaptable to context, placement, and
individual tolerance. Together, these findings highlight modality
novelty, bodily placement, and habituation as critical considera-
tions when designing such sensory interruptions to disrupt habitual
engagement.
5
Limitations and Future Work
While the current study was sufficient to surface comparative pat-
terns and user perceptions, it limits our ability to draw conclusions
about long-term effectiveness, habituation, or sustained behavior
change. Future studies should examine repeated use over extended
periods to better understand how sensory interruptions evolve with
familiarity and whether their impact persists or diminishes over
time. Our findings suggest a trade-off between long-term acceptabil-
ity and effectiveness. While vibrotactile-based interventions may be
quickly habituated and ignored over time, heat-based cues despite
their lower tolerance, may encourage users to actively change their
behavior rather than adapt to the intervention, potentially making
them more effective at breaking habitual behavior loops.
In addition, although we collected objective measures such as
gaze, head movement, and response timing, the present analysis
focused primarily on subjective experience and qualitative observa-
tions. Future work will integrate these objective signals to quantify
micro-pausation, disengagement latency, and recovery dynamics
following interruptions. Such analysis could enable more precise
characterization of how different modalities influence attention at
a temporal level.
Finally, participants’ preferences varied widely across modalities
and body locations, and were often shaped by situational context
(e.g., posture, environment, ongoing activity). This highlights the
need for adaptive and personalized interruption systems that ac-
count for individual sensitivity, context, and environmental condi-
tions. Future systems could dynamically adjust modality, intensity,
and placement to balance effectiveness and comfort. Together, these
directions can inform the design of sensory interruptions that nudge
users towards their ideal behavior.
References
[1] Till Ballendat, Nicolai Marquardt, and Saul Greenberg. 2010. Proxemic inter-
action: designing for a proximity and orientation-aware environment. In ACM
International Conference on Interactive Tabletops and Surfaces. 121–130.
[2] Roy F Baumeister, Brandon J Schmeichel, and Kathleen D Vohs. 2007. Self-
regulation and the executive function: The self as controlling agent. Social
psychology: Handbook of basic principles 2 (2007), 516–539.
[3] Colin Camerer, Yi Xin, and Clarice Zhao. 2024. A neural autopilot theory of
habit: Evidence from consumer purchases and social media use. Journal of the
Experimental Analysis of Behavior 121, 1 (2024), 108–122.
[4] Colin F Camerer and Xiaomin Li. 2021. Neural autopilot and context-sensitivity
of habits. Current Opinion in Behavioral Sciences 41 (2021), 185–190.
[5] Ana Caraban, Evangelos Karapanos, Daniel Gonçalves, and Pedro Campos. 2019.
23 Ways to Nudge: A Review of Technology-Mediated Nudging in Human-
Computer Interaction (CHI ’19). Association for Computing Machinery, New
York, NY, USA, 1–15. doi:10.1145/3290605.3300733
[6] Marta E Cecchinato, John Rooksby, Alexis Hiniker, Sean Munson, Kai Lukoff,
Luigina Ciolfi, Anja Thieme, and Daniel Harrison. 2019. Designing for digital
wellbeing: A research & practice agenda. In Extended abstracts of the 2019 CHI
conference on human factors in computing systems. 1–8.
[7] Hyunsung Cho, Jacqui Fashimpaur, Naveen Sendhilnathan, Jonathan Browder,
David Lindlbauer, Tanya R Jonker, and Kashyap Todi. 2025. Persistent Assistant:
Seamless Everyday AI Interactions via Intent Grounding and Multimodal Feed-
back. In Proceedings of the 2025 CHI Conference on Human Factors in Computing
Systems. 1–19.
[8] Angela L Duckworth, Katherine L Milkman, and David Laibson. 2018. Beyond
willpower: Strategies for reducing failures of self-control. Psychological Science
in the Public Interest 19, 3 (2018), 102–129.
[9] Angela L Duckworth, Rachel E White, Alyssa J Matteucci, Annie Shearer, and
James J Gross. 2016. A stitch in time: Strategic self-control in high school and
college students. Journal of educational psychology 108, 3 (2016), 329.
[10] Nicole D’Aurizio, Tommaso Lisini Baldi, Gianluca Paolocci, and Domenico Prat-
tichizzo. 2020. Preventing undesired face-touches with wearable devices and
haptic feedback. Ieee Access 8 (2020), 139033–139043.
[11] Jakob Engel, Kiran Somasundaram, Michael Goesele, Albert Sun, Alexander
Gamino, Andrew Turner, Arjang Talattof, Arnie Yuan, Bilal Souti, Brighid Mered-
ith, et al. 2023. Project aria: A new tool for egocentric multi-modal ai research.
arXiv preprint arXiv:2308.13561 (2023).
[12] Longjie Guo, Yue Fu, Xiran Lin, Xuhai Xu, Yung-Ju Chang, and Alexis Hiniker.
2025. What Social Media Use Do People Regret? An Analysis of 34K Smartphone
Screenshots with Multimodal LLM. In Proceedings of the 2025 CHI Conference on
Human Factors in Computing Systems. 1–23.
[13] Chris Harrison and Anind K Dey. 2008. Lean and zoom: proximity-aware user
interface and content magnification. In Proceedings of the sigchi conference on
human factors in computing systems. 507–510.
[14] Jaejeung Kim, Joonyoung Park, Hyunsoo Lee, Minsam Ko, and Uichin Lee. 2019.
LocknType: Lockout task intervention for discouraging smartphone app use. In
Proceedings of the 2019 CHI conference on human factors in computing systems.
1–12.
[15] Klaudia Korona-Golec, Tomasz S Ligeza, and Edward Nęcka. 2025. Overlapping
neural activations between trait self-control and cognitive inhibition during
emotional stimuli processing. Scientific Reports 15, 1 (2025), 40814.
[16] Jisoo Lee, Erin Walker, Winslow Burleson, Matthew Kay, Matthew Buman, and
Eric B Hekler. 2017. Self-experimentation for behavior change: Design and
formative evaluation of two approaches. In Proceedings of the 2017 CHI conference
on human factors in computing systems. 6837–6849.
[17] Hu Luo, Tianhao Jin, Yu Zhang, Bohao Tian, Yuru Zhang, and Dangxiao Wang.
2023. A skin-integrated device for neck posture monitoring and correction.
Microsystems & Nanoengineering 9, 1 (2023), 150.
[18] Luca-Maxim Meinhardt, Maryam Elhaidary, Mark Colley, Michael Rietzler,
Jan Ole Rixen, Aditya Kumar Purohit, and Enrico Rukzio. 2025. Scrolling in
the deep: Analysing contextual influences on intervention effectiveness during
infinite scrolling on social media. In Proceedings of the 2025 CHI Conference on
Human Factors in Computing Systems. 1–17.
[19] Aditya Kumar Purohit and Adrian Holzer. 2021. Unhooked by Design: Scrolling
Mindfully on Social Media by Automating Digital Nudges.. In AMCIS, Vol. 21.
1–10.
[20] Stefanie Schaack, George Chernyshov, Kirill Ragozin, Benjamin Tag, Roshan
Peiris, and Kai Kunze. 2019. Haptic collar: Vibrotactile feedback around the
neck for guidance applications. In Proceedings of the 10th Augmented Human
International Conference 2019. 1–4.
[21] Ava Elizabeth Scott. 2023. To do or not to do? Managing intentions with tech-
nology. In Extended Abstracts of the 2023 CHI Conference on Human Factors in


---

CHI EA ’26, April 13–17, 2026, Barcelona, Spain
Dissanayake et al.
Computing Systems. 1–7.
[22] Dylan D Wagner and Todd F Heatherton. 2015. Self-regulation and its failure:
The seven deadly threats to self-regulation. (2015).
[23] Nathan W Whitmore, Samantha Chan, Jingru Zhang, Patrick Chwalek, Sam
Chin, and Pattie Maes. 2024. Improving attention using wearables via haptic
and multimodal rhythmic stimuli. In Proceedings of the 2024 CHI Conference on
Human Factors in Computing Systems. 1–14.
[24] Jun Zhu, Sruzan Lolla, Meeshu Agnihotri, Sahar Asgari Tappeh, Lala Guluzade,
Elena Agapie, and Corina Sas. 2025. A Systematic Review and Meta-Analysis of
Research on Goals for Behavior Change. In Proceedings of the 2025 CHI Conference
on Human Factors in Computing Systems. 1–25.
