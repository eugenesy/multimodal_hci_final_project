RESEARCH ARTICLE
Robot-Assisted Proprioceptive Training with
Added Vibro-Tactile Feedback Enhances
Somatosensoryand Motor Performance
Anna Vera Cuppone1*, Valentina Squeri1¤, Marianna Semprini2, Lorenzo Masia3,
Ju¨rgen Konczak4
1 Motor Learning and Robotic Rehabilitation Laboratory, Department of Robotics, Brain and Cognitive
Sciences, Istituto Italiano di Tecnologia, Genova, Italy, 2 Neural Computation Laboratory, Center for
Neuroscience and Cognitive Systems, Istituto Italiano di Tecnologia, Rovereto, Italy, 3 School of Mechanical
& Aerospace Engineering, Nanyang Technological University, Singapore, Singapore, 4 Human
Sensorimotor Control Laboratory, School of Kinesiology and Center for Clinical Movement Science,
University of Minnesota, Minneapolis, MN, United States of America
¤ Current address: Department of Rehab Technologies (RTECH), Istituto Italiano di tecnologia (IIT),
Genova, Italy
* anna.cuppone@iit.it
Abstract
This study examined the trainability of the proprioceptive sense and explored the relation-
ship between proprioception and motor learning. With vision blocked, human learners had
to perform goal-directed wrist movements relying solely on proprioceptive/haptic cues to
reach several haptically specified targets. One group received additional somatosensory
movement error feedback in form of vibro-tactile cues applied to the skin of the forearm.
We used a haptic robotic device for the wrist and implemented a 3-day training regimen
that required learners to make spatially precise goal-directed wrist reaching movements
without vision. We assessed whether training improved the acuity of the wrist joint position
sense. In addition, we checked if sensory learning generalized to the motor domain and
improved spatial precision of wrist tracking movements that were not trained. The main
findings of the study are: First, proprioceptive acuity of the wrist joint position sense
improved after training for the group that received the combined proprioceptive/haptic and
vibro-tactile feedback (VTF). Second, training had no impact on the spatial accuracy of the
untrained tracking task. However, learners who had received VTF significantly reduced
their reliance on haptic guidance feedback when performing the untrained motor task. That
is, concurrent VTF was highly salient movement feedback and obviated the need for haptic
feedback. Third, VTF can be also provided by the limb not involved in the task. Learners
who received VTF to the contralateral limb equally benefitted. In conclusion, somatosen-
sory training can significantly enhance proprioceptive acuity within days when learning is
coupled with vibro-tactile sensory cues that provide feedback about movement errors. The
observable sensory improvements in proprioception facilitates motor learning and such
learning may generalize to the sensorimotor control of the untrained motor tasks. The impli-
cations of these findings for neurorehabilitation are discussed.
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
1 / 18
a11111
OPEN ACCESS
Citation: Cuppone AV, Squeri V, Semprini M,
Masia L, Konczak J (2016) Robot-Assisted
Proprioceptive Training with Added Vibro-Tactile
Feedback Enhances Somatosensory and Motor
Performance. PLoS ONE 11(10): e0164511.
doi:10.1371/journal.pone.0164511
Editor: Sliman J. Bensmaia, University of Chicago,
UNITED STATES
Received: May 6, 2016
Accepted: September 25, 2016
Published: October 11, 2016
Copyright: © 2016 Cuppone et al. This is an open
access article distributed under the terms of the
Creative Commons Attribution License, which
permits unrestricted use, distribution, and
reproduction in any medium, provided the original
author and source are credited.
Data Availability Statement: All relevant data are
within the paper and its Supporting Information
files.
Funding: The authors received no specific
founding for this work.
Competing Interests: The authors have declared
that no competing interests exist.


---

Introduction
Proprioceptive information is essential for the control of movement. Its fundamental role for
upper limb, postural and gait control becomes evident when examining the effects of sensory
deafferentation on motor function. For example, despite intact motor pathways, patients with
large fiber sensory neuropathy are unable to modulate force during grasping [1,2] and to coor-
dinate even simple multi-joint movements [3]. They rely heavily on vision to control reaching
and locomotion, but visual feedback only partially restores motor function [4,5]. Motor impair-
ments associated with proprioceptive dysfunction have also been reported in numerous other
neurological diseases such as Parkinson disease [6,7], focal dystonia [8], and stroke [9–13].
There is a growing interest in understanding the functional link between proprioception
and motor control and its role in fostering neural plasticity through learning [14]. Increasing
evidence indicates that learning related changes are bidirectional. That is, proprioceptive func-
tion may be enhanced after learning a motor task [15] or, vice versa, proprioceptive sensory
training may improve motor performance [16]. With respect to enhancing the proprioceptive
senses, the term proprioceptive training has been used to describe interventions that seek to
improve proprioceptive function. It focuses on the use of somatosensory signals such as propri-
oceptive or tactile afferents in the absence of information from other modalities such as vision.
In the context of rehabilitation its ultimate goal is to improve or restore sensorimotor function
[17]. For the sake of brevity and consistency with existing literature we use the term propriocep-
tive training throughout this paper, but the reader should be mindful that such training is
always a form of proprioceptive-motor training, because proprioception it is inherently linked
to bodily movement. Unlike, for example, auditory training to improve pitch perception, pro-
prioceptive training typically involves limb or bodily motion or postures.
With respect to improving impaired motor performance due to proprioceptive dysfunction,
several approaches have been suggested to substitute or to augment residual proprioception
through feedback from other sensory modalities in the hope that it would stabilize or improve
motor function. Such sensory substitution has been provided through visual displays, the mod-
ulation of auditory pitch or by attaching mechanical vibrating stimulators to the skin [18].
There have been additional attempts to directly stimulate somatosensory afferents through
neural interfaces using penetrating or surface electrodes [19] with the same aim of enhancing
residual proprioceptive function.
The usefulness of tactile vibratory stimulation to enhance proprioception is particularly
plausible, because proprioceptive and tactile afferents both terminate and share overlapping
networks in the somatosensory cortex [20,21]. In this context it is important to consider the
differences between vibro-tactile stimulation and vibro-tactile feedback (VTF). Experimenters
have used vibro-tactile stimulation as an unspecific,somatosensory co-stimulation of proprio-
ception. For example, vibratory stimulation of the distal wrist musculature has been used to
promote stability of the proximal arm during reaching in hemiparetic patients [22]. Others
have used vibratory stimulation as feedback to indicate error direction and magnitude related
to an unwanted trunk sway [23,24]. Only in the latter case does mechanical vibration of the
skin provide movement-relevant information. In a recent proof-of-concept study [25] we
investigated, if VTF can augment proprioceptive sensory information. We tested two different
groups of healthy subjects, one trained only with haptic feedback and one with haptic and
vibro-tactile feedback and found that only the group receiving the multimodal feedback signifi-
cantly improved the proprioceptive acuity indicating that VTF may enhance a proprioceptive
training regimen.
Despite numerous claims that behavioral therapies focusing on proprioception are useful in
treating motor impairments, reports on the efficacyof proprioceptive training vary widely
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
2 / 18


---

[17]. At present, it is not even established to what extent such sensory training actually
improves proprioceptive function in healthy populations. In addition, there is a paucity of data
clearly indicating if and by how much such sensory improvements translate into motor
improvements. Finally, little is known of how additional movement-relevant feedback pro-
vided as tactile feedback enhances this sensorimotor training process.
To address this knowledge gap, this study objectively quantified improvements in proprio-
ceptive function due to proprioceptive training in a group of healthy young adults. We used a
robotic device to employ a haptic proprioceptive training program that focused on joint posi-
tion sense and required the learner to make spatially precise wrist movements. Training
occurredwithout vision and required goal-directedmovements to haptically specifiedtargets.
In a subgroup of participants proprioceptive training was augmented by additional vibro-tac-
tile, movement-related feedback (VTF) on the forearm to determine, if such added feedback
enhanced proprioception. Finally, to understand if the effectiveness of such vibro-tactile feed-
back is dependent on anatomical location, we applied vibro-tactile feedback either to the ipsi-
lateral or contralateral forearm of the trained wrist.
Materials and Methods
Subjects
Twenty-eight right-handed young adults (13 males and 15 females; age: 25.7 ± 4.0 years) with
no known neuromuscular disorders and naïve to the tasks participated in the experiment. The
research conformed to the ethical standards laid down in the 1964 Declaration of Helsinki,
which protects research subjects and was approved by the ethics committee of the ASL3 of
Genova (Italy). Each subject signed a consent form conforming to these guidelines.
Apparatus and experimental setup
The experimental setup (Fig 1A) utilized a three degree-of-freedom(DoF) wrist robotic exo-
skeleton (Wristbot) describedin detail elsewhere [26]. In short, the robot allowed for the inde-
pendent activation of wrist flexion-extension (± 70°), wrist abduction-adduction(± 40°) and
forearm pronation-supination (± 57°) within a mechanical workspace that closely matched the
physiological range of motion. The robot is powered by 4 brushless DC motors: two motors for
abduction-adductionallowing for gravity compensation and one motor for each of the two
remaining DoFs. An impedance control scheme was used to generate an assistive force field
based on relative positions between the target and the end-effector, with a 1 kHz sampling fre-
quency for haptic rendering. Vibro-tactile feedback was generated using an additional setup
worn by the subjects and made by 4 vibration motors (307–100 Precision Microdrives): such
wearable setup can be used to provide vibrational feedback through the ipsilateral or contralat-
eral limb to the exercised wrist (Fig 1A). A real time workstation controlled both the robotic
device and the vibro-motors, by means of analog and digital channels from a PCI acquisition
card (Sensoray, model 626), while four digital counters read the end effector positions from the
optical encoders embedded in the wrist haptic device. The software environment was imple-
mented on Real-Time Windows Target™.
Experimental design
A pretest-posttest intervention design was employed with three groups (Fig 1B). Subjects were
randomly allocated to three different groups: a control group (N = 7) who received no proprio-
ceptive training (NOPT); a treatment group (N = 7), who received proprioceptive training only
(PT); a second treatment group (N = 14), who received proprioceptive training with additional
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
3 / 18


---

vibro-tactile feedback (PTVTF).In the PTVTF group vibro-tactile feedback was applied either
to the left (contralateral) or right (ipsilateral) arm with an equal number of subjects in each
subgroup (PTVTFleft: N = 7; PTVTFright: N = 7).
Training consisted of three 1-hour sessions spread over three days. During training subjects
performed discrete, goal-directedreaching movements (center-out task). Before and after
training, proprioceptive function was assessed for measuring position sense acuity [27]. In
addition, wrist-hand motor performance was tested in an untrained, continuous movement
tracking task: the purpose of examining motor performance in this task that was not explicitly
trained and was sufficiently different from the trained center-out task, allowed to determine
whether sensory training may successively generalize to the motor domain. An overview of the
design is shown in Fig 1B–1C and procedure details are describedbelow.
Procedure
Subjects sat on a chair and were asked to grasp the handle connected to the robot end-effector
and their forearm was constrained by straps to a rigid holder, in such a way that the
Fig 1. Experimental setup and training protocol. (A) The 3 degrees-of-freedom robot (WristBot) and the placement of the vibro-tactile
actuators in the ipsilateral and contralateral configuration. The 4 vibro-tactile actuators were placed on the forearm to indicate right, left, up and
down directions in order to correct movement trajectory. (B-C) Overall training protocol. All groups underwent proprioceptive and motor
assessment which consisted of joint position sense testing and the wrist tracking task. Training executed by PT and PTVTF groups consisted of a
center-out reaching task with haptic and vibro-tactile feedback.
doi:10.1371/journal.pone.0164511.g001
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
4 / 18


---

biomechanical joints axes were closely aligned with the axes of rotation of the robot. Particular
care was taken to maintain the angle of the elbow joint at approximately 90°.
Pre- posttest proprioceptive and motor assessment. Joint position sense assessment. We
employed an established method to assess proprioceptive acuity [28] at the beginning and at
the end of whole experiment. With vision occluded, participants had to match a previously
experiencedjoint position by actively moving the wrist to this position performing an Ipsilat-
eral matching task [27] (Fig 1C left panel). First, the subject’s hand was passively moved along
a minimum jerk trajectory by the robot from the central position to a predetermined position
and then repositioned to the start position at the center (center-out-center movement). Then,
upon an acoustic cue the subject attempted to match the previous position by actively moving
the wrist to the target position and then holding it while verbally indicating to the experimenter
that this was the matched joint position. Upon verbal confirmation the WristBot moved the
end effector back to the central position to end the trial. One training block included 24 trials
(3 movement repetitions each to 8 target positions, see Fig 1C) involving a single joint or the
combination of wrist flexion/extension and abduction/adduction,depending on the target
position. The targets were spaced on an ellipse with semi-major and semi-minor axis corre-
sponding to 40° of flexion/extension and 15° of abduction/adduction,respectively, in order to
follow the biomechanical anisotropy of wrist between the two DoFs.
Motor performance in the untrained tracking task. This task aimed at evaluating if improve-
ments due to the center-out training can be generalized to a different exercise, performed in
the same workspace but involving different coordination of the two wrist DoF. The task con-
sisted in tracking a moving target that drew a circumference according to the following trajec-
tory:
xTGðtÞ ¼ Rcos 2pt
T


yTGðtÞ ¼ Rsin 2pt
T


8
>
>
>
<
>
>
>
:
;
ð1Þ
where xTG and yTG were the moving target coordinates on the coordinated axes, R was the
radius of the circle, equal to 15° (Fig 1C center panel). The target stopped as the Euclidean dis-
tance between target and end effector exceeded a 5° threshold and it restarted its motion once
this distance became lower than this threshold. The complete round nominal duration was
equal to the 10s in case the target moved without stopping. The starting point was positioned
at 15° of extension and at 0° of adduction. Each block of movements consisted of 10 circular
movements covered in two directions, i.e. 5 clockwise circles and 5 counterclockwise circles.
Participants were blindfolded and the robot provided haptic feedback about the desired trajec-
tory by delivering a torque that attracted the end effector through the target:
Torque i ¼ K  jyEEi   yTGij;
ð2Þ
where i corresponds to either the flexion/extension (FE) or abduction/adduction(AA). θEE and
θTG indicate the angular position of the end effector and target and K was the stiffness coeffi-
cient (Nm/rad). The K value was continuously modulated according to the distance between
the target and the end effector in order to progressively and smoothly modulate the haptic
feedback: its magnitude increased if the distance was larger than 5° and decreased when sub-
jects succeededin tracking the moving target. The modulation of K was regulated by a ramp
with a slope of 0.1 Nms/rad.
Proprioceptive training: wrist reaching task. In absence of visual feedback, subjects per-
formed discrete center-out reaching movements to 8 haptically specifiedtargets (Fig 1C right
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
5 / 18


---

panel). When a target was actively reached under different feedback conditions, as explained in
the next section, an acoustic feedback was given and the robot passively moved the subject’s
wrist back to the center of the workspace before initiation of the next. The targets were equally
spaced on an ellipse with semi-major and semi-minor axis corresponding respectively to 40° of
flexion/extension and 15° of abduction/adduction(i.e. same workspace of the Joint position
sense assessment task). The single session was organized into 7 target sets. Each target set
included 3 reaching movements for each of the 8 targets, with a total of 24 center-out move-
ments. The order of presentation of the peripheral targets within a target set was randomized.
The experimental training protocol consisted of 3 sessions, in 3 consecutive days for a total of
504 trials.
Haptic feedback to specify the target. Because vision was blocked, for the trained wrist
reaching task the WristBot rendered a haptic force feedback about the direction of the target at
the handle during a trial. For each trial the feedback was a constant torque ruled by the equa-
tion:
Fi ¼ k ðyEEi   yTGiÞ
jðyEEi   yTGiÞj ;
ð3Þ
where i corresponds to either the flexion/extension or abduction/adduction.θEE and θTG indi-
cate the angular position of the end effector and target, respectively, and k was the magnitude
of the force field: at the beginning of each trial, when the subject was positioned on the central
target, the k value increased with a ramp profile and stopped to a constant value as the subject
began to move (speed  0.4rad/s). This means that the torques in flexion/extension and in
abduction/adductionwere constant during each trial. They represented the smallest torques
necessary to perceive the direction of the haptic target.
Vibro-tactile feedback. Vibro-tactile feedback was provided by 4 small, encapsulated vibra-
tion motors placed on the forearm region of dermatome C6 and secured with velcro and adhe-
sive tape to the skin according the 4 different coordinated directions of movement (Fig 1A).
Each vibrator provided feedback for movement in a specific direction for the two DOF of the
wrist. The lateral vibrator turned on during wrist flexion, the medial during extension, while
the anterior vibrator was active during adduction and the posterior during abduction. While
performing the center-out task, the real-time system checked whether the participant deviated
from the ideal straight line path towards the target by evaluating the lateral deviation (defined
as the vector connecting the current position of the end-effector to its orthogonal projection on
the ideal trajectory).Feedback about the extent of the deviation from the ideal path was
encoded by vibration amplitude and frequency in three frequency bands (70, 80, 90 Hz), until
the error was detected and therefore corrected by the subject. Both amplitude and frequency
increased as the deviation from the ideal path increased (Table 1). This implies that for one sin-
gle DOF motion only one vibrator was active at a time, while two motors could vibrate during
motions involving the combination of two DOFs. Note that the vibro-tactile feedback did not
alter the task dynamics. Prior to testing we verified that each subject could detect and differen-
tiate between the three levels of vibration feedback.
Table 1. Settings for providing vibro-tactile feedback.
Vibration Frequency [Hz]
Vibration Amplitude [g]
Range of lateral deviation [deg]
70
0.9
1.5–3
80
1
3–5
90
1.1
5–7
doi:10.1371/journal.pone.0164511.t001
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
6 / 18


---

Measurements
Pre-posttest outcome measures. Position sense measure: We quantified a joint position
Matching Error (ME) defined as the angular distance between the final position of the end
effector and the target position:
ME ¼ 2arcsin
ﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃ
sin2 Δy
2

 þ cosy1 cosy2 sin2 Δʎ
2


s
 
!
;
ð4Þ
where Δθ = Ytg—Yee and Δʎ = Xtg—Xee.
Motor performance measures of the untrained tracking task. To assess subject performance
during tracking task, we evaluated the Tracking Error (TE), computed as the mean value of the
instantaneous euclidean distance between the target and the end effector. It is a measure of
accuracy and therefore for an ideal errorless tracking corresponds to a zero value. We further
evaluated the magnitude of the haptic force guidance experiencedby the participant during the
tracking task. We first computed the vectorial sum of Torque FE and Torque AA (see Eq 2). Then,
we averaged the summed torque for each of the 10 circle movements and finally computed the
mean across each movement to obtain a global measure of haptic force feedback (HF).
Measures to evaluate training of the wrist reaching task. To map progress during the
3-day training phases (reaching task) we recorded the wrist angular position for each DOF at a
sampling frequency of 100 Hz for each trial. The respective time-series data were smoothed
with a 4th order Savitzky-Golay filter (window size = 150 ms, equivalent to a cut-off frequency
of 11 Hz) and then used to estimate the first two time derivatives (i.e., velocity and accelera-
tion). Resultant speed end effector was computed as:
Speed ¼
ﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃ
vFE
2 þ vAA
2
p
;
ð5Þ
where vFE and vAA are the velocity components of FE and AA wrist movement respectively.
To assess changes in motor and sensory performance during the 3-day training period the
following variables were analyzed.
Movement time: The movement time (MT) was defined as the time between movement
onset and end; movement onset was identified as the first time when speed exceeded a thresh-
old of 0.04 rad/s; movement end represented the time that the End Effector-Target distance
was smaller than 0.05 rad for at least 50 ms (i.e. had reached the target).
Maximum lateral deviation: The maximum lateral deviation (MLD) was defined as the
highest value of the lateral deviation for a given joint angular trajectory. It was computed as the
minimum instantaneous angular distance between the instantaneous wrist position and the
ideal trajectory, which is the segment that directly links the center of the workspace with the
target position.
Number of movement units. The Movement units (MU) represents the number of peaks in
the speed profile between movement onset and end, computed as the number of local minima
in the speed profile. It measures the degree of segmentation of the reaching motion and serves
as an indirect indicator of the smoothness of the movement.
Statistical analysis
For each variable we performed a repeated measures ANOVA with two factors: GROUP (3 dif-
ferent groups: PT, PTVTF,NOPT) and TIME (before/after training or early/late training
phase) in order to understand the effects of training. When the analysis yielded a significant
main or interaction effect (p < 0.05), we subsequently applied paired t-tests. For these tests, the
significance level was adjusted using Bonferroni correction to account for multiple testing.
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
7 / 18


---

After applying a Bonferroni correction, the significant p-value was set to p = 0.05/6 = 0.0083
for determining possible between-group differences at baseline (pretest) and for pre-posttest
comparisons within groups (3 groups: PT, PTVTF, NOPT), which resulted in 6 separate tests
(3 between-group comparisons at baseline and 3 within-group comparisons to assess treatment
effects). This significant level was applied to the pre-posttest outcome measures (i.e. Matching
Error, Tracking Error and Haptic force feedback).
The significant p-value was set to p = 0.05/4 = 0.0125 for measures that evaluated training
effects (i.e. Movement time, Maximum lateral deviation and Number of movement units) of the
wrist reaching task (2 training groups: PT and PTVTF),which resulted in 2 between-group
comparisons at baseline and 2 within-group comparisons).
Results
Measures of motor learning during proprioceptive training
In order to evaluate the effect of motor learning during the 3-days of proprioceptive training
on the two training groups (PT and PTVTF), we considered the change between early and late
training (all values are reported as mean ± SE). As indicator of movement accuracy we evalu-
ated the maximum lateral deviation (MLD) from the ideal straight-line trajectory. The effect of
VTF on movement accuracy was evident with the PTVTF group exhibiting consistently lower
MLD values throughout training (see Fig 2A).
Statistical analysis of MLD revealed a significant main effect for GROUP (F = 24, p < 0.001)
and a significant GROUP x TIME interaction effect (F = 5.66, p = 0.02). The PTVTF group
exhibited significantly lower maximum lateral displacement during the entire training period
when compared to the PT group (Fig 2B; EARLY: PT vs PTVTF, p = 0.011). Yet, the PTVTF
Fig 2. Motor learning related changes in the center-out pointing task during training. Each data point represents the group mean for a block of 24
trials (each training day consisted of 7 blocks; group mean = mean of individual subject means). Error bar represents the Standard Error. (A) Maximum
Lateral Deviation (MLD). (B) Movement Time (MT). (C) Number of movement units (MU). PT = proprioceptive training; PTVTF = proprioceptive training
+ vibro-tactile feedback.
doi:10.1371/journal.pone.0164511.g002
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
8 / 18


---

group significantly decreased MLD during training while the PT group did not (PTVTF:
EARLY = 3.8° ± 0.14° vs LATE = 2.97° ± 0.23°, p = 0.0037; PT: EARLY = 4.65° ± 0.32°
LATE = 4.81° ± 0.29°, p > 0.0125).
Other indicators of motor learning that were analyzed were movement time (MT) and move-
ment units (MU). Fig 2B shows how MT changed for both training groups during the three
days of training. Here the PT group revealed consistently faster performance than the PTVTF
group during early training, but at the end of the training, both groups exhibited movement
times that were no longer significant from each other. The respective ANOVA test yielded a
significant TIME (F = 13.39 p = 0.0016), and GROUP effect (F = 6.75, p = 0.017) and a signifi-
cant interaction between GROUP and TIME (F = 4.4 p = 0.049). The PTVTF significantly
decreased MT with learning (EARLY 4.82 ± 0.74 s, LATE: 1.65 ± 0.24 s, p = 0.00078), while
MT did not change significantly in the PT group (EARLY: 2.08 ± 0.46 s, LATE: 1.21 ± 0.14 s,
p > 0.0125).
Training affected the smoothness of the executed movement as shown by training-related
changes in movement units (Fig 2C). All groups significantly decreased the number of MU
with training (TIME main factor: F = 15.91, p = 0.0008). The extent of decrease in MU was
significantly different between groups (GROUP main factor: F = 8,73 p = 0.0082). During
training the PT group mean MU decreased from 5.31 ± 0.83 to 2.39 ± 0.18 (EARLY vs LATE:
p = 0.011), while PTVTF group mean decreased MU by 66%, from 11.34 ± 1.67 to 3.83 ± 0.49,
(EARLY vs LATE: p = 0.001). The initial difficultyof the PTVTF group in performing a
smooth movement was expressed by a higher MU value in early training (EARLY: PTVTF vs
PT, p = 0.024 not significant after Bonferroni correction). The interaction between GROUP
and TIME was not statistically significant (p > 0.05).
Effect of proprioceptive training on joint position sense
We evaluated the effect of proprioceptive training in proprioceptive functions by comparing
the pre and post training performance for joint position matching task. Analysis of the joint
position matching error yielded a significant GROUP x TIME interaction effect (F = 5.7
p = 0.008). Subsequent within-group analysis revealed that the NOPT group mean for the
Matching Error (ME) decreased by 3.44% (PRE: 4.06° ± 0.19°; POST: 3.92° ± 0.2°; p > 0.0083),
while ME in the PT group decreased slightly by 17% (PRE: 4.37° ± 0.31; POST: 3.68° ± 0.2;
p > 0.0083) and the PTVTF group mean ME decreased by 38% (PRE: 4.6°; POST: 3.05°;
p = 0.00015). Between-group analysis showed that there were no significant differences of ME
among groups prior to training (pre-test) confirming that our group data were unbiased (PRE:
PT vs PTVTF, PTVTF vs NT, NT vs PT p’s > 0.0083). Fig 3 shows the relevant ME values for
each group prior and post training.
Generalization: Effect of proprioceptive training on motor function in the
untrained motor task
To evaluate, if improvements in proprioceptive acuity may be generalized to improvements in
motor precision, we analyzed the changes in movement errors and the use of haptic feedback
in the tracking task that was not trained. We found that training had not led to a significant
decrease in tracking error when the two proprioceptive training groups were compared to the
between the NOPT group (PT, PTVTF; p’s > 0.05).
In a second step we examined the use of haptic guidance as measured by the haptic force
feedback (HF). The analysis of HF showed a significant effect for TIME x GROUP interaction
(F = 3.85, p = 0.035). The only group that significantly decreased the amount of HF was the
PTVTF group (p < 0.0001). The specific group values for TE and HF are shown in Table 2.
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
9 / 18


---

Fig 4 shows the pre- to post-training change in TE as a function of HF illustrating that while
the motor performance did not differ between groups their use of haptic feedback had changed
after proprioceptive training.
Effect of vibro-tactile feedback location on proprioceptive and motor
function
To investigate whether the location (ipsilateral or contralateral, Fig 1A) of the vibro-tactile
feedback affected the proprioceptive and motor function, we applied the t-test comparison
between PTVTFright and PTVTFleft for pre- and post- training on all assessment variables. The
analysis did not reach significancefor any of the evaluated indicators between these two groups
(p’s > 0.05). Fig 5 summarizes the relevant results for PTVTFright and PTVTFleft for matchinig
error, haptic force feedback and tracking error.
Fig 3. Effect of proprioceptive training on proprioceptive acuity. The boxplot shows the pre- and post-
training distribution of the position matching error (ME) for each experimental group. Medians are indicated
by the solid line inside the box. The lower and upper edges of the box represent the 25th and 75th percentiles,
respectively. The whiskers indicate the 1st and 99th percentile. Asterisks (*) indicate statistically significant
differences for between-group (POST: PT vs PTVTF; NOPT vs PTVTF) and within-group (PTVTF: PRE vs
POST) comparisons.
doi:10.1371/journal.pone.0164511.g003
Table 2. Tracking error and magnitude of haptic force in the untrained motor task.
Variables
Groups
PRE
POST
Statistic
Tracking error [deg]
NOPT
3.86 ± 0.14
4.21 ± 0.2
p>0.05
PT
3.96 ± 0.2
3.79 ± 0.15
p>0.05
PTVTF
3.88 ± 0.11
4.04 ± 0.1
p>0.05
Haptic force feedback [Nm]
NOPT
0.019 ± 0.002
0.018 ± 0.003
p>0.05
PT
0.021 ± 0.002
0.017 ± 0.002
p>0.05
PTVTF
0.021 ± 0.001
0.015 ± 0.001
P<0.0001
doi:10.1371/journal.pone.0164511.t002
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
10 / 18


---

Fig 4. Effect of proprioceptive training on the untrained wrist tracking task. Pre to posttest change in
the use of haptic force feedback (HF) as a function of tracking error (TE). Each data point represents the
coordinates of the respective group means. The error bars represent Standard Error. The percentage of
change was calculated as (initial value—final value) / initial value. Positive values correspond to a decrease
of the variable with training. Note that the PTVTF group had significantly decreased the amount of haptic
feedback after training.
doi:10.1371/journal.pone.0164511.g004
Fig 5. Effect of vibrotactile feedback location. Matching error (ME), haptic force feedback (HF) and tracking error (TE) values for
PTVTFright (light gray) and PTVTFleft (dark gray) groups. Each point represents group mean, pre and post training and the bars represent
the SE. The comparison shows no difference between the two groups for each variable.
doi:10.1371/journal.pone.0164511.g005
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
11 / 18


---

Discussion
This study explored how a non-visual, haptic feedback-basedsensorimotor training affects
proprioception and motor learning. It compared a training that relied solely on proprioceptive
and haptic guidance feedback with a learning paradigm that combined proprioceptive observa-
tional learning with vibro-tactile error feedback learning.
Specifically, we used a robotic device capable of providing haptic feedback and designed a
training regimen that required the learner to make spatially precise wrist movements in the
absence of vision. We assessed if proprioceptive training improved the acuity of the wrist joint
position sense. Subsequently, we analyzed, if providing vibro-tactile movement feedback dur-
ing training would enhance learning and be associated with better learning outcome measures.
Finally, we checked if the spatial precision of wrist tracking movements, that were not trained,
was improved.
The main findings of the study are the following: First, proprioceptive acuity of the wrist
joint position sense was improved after proprioceptive training in the group that received
vibro-tactile feedback. Second, the training had no impact on the spatial precision observedin
the untrained wrist tracking task, but learners who received additional vibro-tactile movement
feedback significantly reduced their reliance on haptic guidance feedback when performing the
task. Third, the anatomical location for providing vibro-tactile feedback was not essential. In
other words, VTF did not have to be applied to the trained limb. Learners who had received
VTF to the contralateral limb equally benefitted from it. In the following, we will discuss our
main findings and their implications in more detail.
Sensory changes in proprioception due to training
We measured proprioceptive acuity of wrist joint position sense before and after training to
determine to what extent proprioceptive training induces changes in the precision of the pro-
prioceptive sense. Our results show that over the course of the 3-day training acuity of the
wrist joint position sense did improve when a multimodal feedback was applied. However, the
general conclusion that a sensorimotor training regimen focusing on proprioception enhances
proprioceptive precision, needs to be qualified.
We found that the proprioceptive training group relying solely on haptic guidance (PT
group) showed a slight, but statistically not significant improvement in proprioceptive acuity
(+ 17%). In contrast, the group that received additional vibro-tactile feedback (PTVTF) exhib-
ited a 38% increase in acuity (see Fig 3). Such magnitude of improvement in sensory acuity
after a brief 3-day training is impressive and would be considered highly effective in a rehabili-
tation setting. From a neurophysiological perspective, two scenarios for the observedenhance-
ments in proprioceptive acuity can be envisioned. First, VTF stimulates overlapping neuronal
networks involved in the processing of somatosensory afferents such as in the somatosensory
cortices [20]. Such co-stimulation could be unspecific to the motor task and it mainly serves to
amplify neural activity in those regions that are central for forming proprioceptive percepts.
Second, it is the movement related error feedback provided through VTF that is essential for
inducing the observedchanges in limb position sense. In other words, the sensory modality
providing the relevant error cues is not important, but it is the saliency of the error informa-
tion. We would contend that both factors plausibly play a role in enhancing proprioceptive
function. With respect to the effect of sensory co-stimulation on movement perception, both
visual-proprioceptive and tactile-proprioceptive co-stimulation has been shown to be highly
effective in inducing kinaesthetic illusions of hand rotation [29]. However, in order to enhance
the kinaesthetic illusion the bimodal sensory integration of tactile with proprioceptive stimuli
need to be congruent [30].
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
12 / 18


---

When trying to understand the underlying neurophysiological processes responsible for the
observedenhancements in limb position sense, it should be noted that our measure of proprio-
ceptive acuity does not reflect exclusively the processing of afferent proprioceptive signals from
the periphery. Because the applied joint matching method required an active joint movement
to match the previously experiencedjoint position, it also reflects the processing of the integra-
tion of this external feedback with an internal feedback, or predicted sensory feedback, derived
from the motor command [28,31–34]. That is, the described“sensory” effect may reflect
changes in the processing of afferent feedback, as well as the updating of an internal forward
dynamics model [35] and processes of integrating internal and external afferent feedback.
Effects of proprioceptive learning on untrained motor function
Besides investigating to what extent the proprioceptive sense is trainable, we also examined, if
such training affected motor performance. That is, could one find evidence that proprioceptive
training as an intervention that seeks to improve proprioceptive function also improves senso-
rimotor function? This question is challenging to address experimentally. Unlike senses such
as audition, where, for example, pitch perception can be trained in the absence of limb or body
movement, proprioception necessarily requires movement. Thus, when evaluating the effec-
tiveness of a somatosensory intervention to improve motor behavior, it is difficultto isolate the
sensory from a motor aspect of training. In fact, one can argue that any form of motor learning
is associated with proprioceptive processing and thus may train proprioception. In addition,
there is evidence that such motor-sensory link is an integral part of sensorimotor learning
[36,37]. Vice versa, one can argue that any form of proprioceptive training is eo ipso a form of
motor training.
To address the issue of the embodiment of the proprioceptive sense, we had participants
perform a second motor task that also required spatially precise wrist motion but was not part
of the training. Because this task was not explicitly trained, one might assume that participants
would not show meaningful improvements in the motor performance of this task. On the con-
trary, if participants did show signs of improved motor performance, then it was reasonable to
conclude that such improvements could not simply be explained as “pure” effects of motor
learning leading to improved motor control with neural changes primarily motor cortical areas
involved in planning and execution. We therefore chose a continuous tracking task known to
be sufficiently distinct from the discrete movement, goal-directedcenter-out task.
Our analysis revealed that proprioceptive training had no impact on the spatial movement
precision in the untrained wrist tracking task. That is, the observable improvements in wrist
proprioceptive acuity did not directly translate to a higher spatial precision of wrist move-
ments, in general. In contrast to our result, a recent report revealed a direct motor effect as a
function of somatosensory training [38]. In this study trajectory straightness was improved in
a goal-directedreaching task after a 500-trial somatosensory training that required participants
to sense the left-rightward deviation of a hand trajectory, while the hand was passively moved.
Moreover, somatosensory training was associated with increases functional connectivity
between anterior parietal brain regions (i.e. Brodmann area 2, bilateral primary somatosensory
cortex), and dorsal frontal motor areas (i.e. left primary motor cortex, dorsal premotor cortex).
That is, a network comprising somatosensory and motor areas showed elevated functional con-
nectivity and this elevation was tightly related to the observedimprovements in both motor
and somatosensory domains.
In our view, the contradictory findings of the two studies relate to differences with respect
to the “specificity of training” and may reflect the limitations of proprioceptive training. Both
studies used discrete, goal-directedmovements during somatosensory training. The motor
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
13 / 18


---

transfer task in Vahdat et al. (2014) also involved short-duration discrete goal-directedmove-
ments, while in our experiment motor transfer required longer-duration continuous tracking
movements. That is, the untrained motor task either involved similar types of hand trajectories
(straight, with a defined start and end), and thus, sensory training had a high degree of specific-
ity with respect to the motor transfer task, or it had lower specificity as for the continuous
tracking task.
Both studies demanded the same amount of practice trials (500 vs. 504). It is therefore
unlikely that differences in “dosage” can fully account for the differences between the two stud-
ies. In summary, a picture emerges from the current empirical evidence that shows that, in
order to be effective, proprioceptive training may have to be closely tailored to the biomechani-
cal constraints of the motor task. Somatosensory training may not easily generalize to a larger
motor work- and task space.
The role of somatosensory error feedback for improving motor control
Theories of sensorimotor learning typically distinguish between use-dependent learning, obser-
vational learning, reward-, and error-based learning [39]. Use-dependent learning implies that
one learns by pure repetition, while observationallearning is typically driven by providing visual
information about a desired movement or movement target. In this study we did not provide a
visual image of the desired trajectory or target but a haptic “image” of the trajectory. That is, our
study participants observedhaptically not visually. When those “pure” observationallearners
(PT group) were compared to those who also received somatosensory error feedback (PTVTF
group), the trajectory kinematics during training revealed that observationallearners in the PT
group were faster and exhibited smoother trajectories in the early stages of learning. That is,
during early learning the additional feedback modality actually degraded motor performance
(see Fig 2B–2C). These initial differences in performance likely reflect that the VTF group had
to learn how to use of the VTF to guide movement. That is, movement or proprioceptive-like
feedback from a sensory modality typically not utilized for movement guidance needed to be
incorporated in the underlying processes of sensorimotor integration necessary for trajectory
control. In addition, the early superior performance of the observationallearners of PT group in
terms of movement time and movement smoothness began to vanish during the second training
day. By the end of training on day 3, the PTVTF group generated joint trajectories that were
similarly fast and smooth when compared to their PT group counterparts.
In contrast to the motor performance decrements observedin learners that have only haptic
feedback available during early learning, VTF produced clear performance benefits from the
beginning of training. Those learners who received VTF produced straighter trajectories
already in the first training blocks indicating that they were able to incorporate this new spatial
error feedback quickly and to use it throughout the 3-day training. In conclusion, the above
findings underline the notion that the availability of haptic guidance feedback is not or only
partially sufficient for the learning of the spatial characteristics of limb or end effector trajecto-
ries [40]. The availability of movement feedback from another somatosensory modality signifi-
cantly aided trajectory formation leading to consistently straighter trajectories (see Fig 2A–2B).
That is, the coupling haptic observationalwith somatosensory error feedback learning was ben-
eficial for motor learning. These results are consistent with previous research on motor learn-
ing that found that multimodal is superior to unimodal learning and that augmented feedback
from an additional modality promotes motor learning [41].
When considering the generalization or transfer of somatosensory-basedtraining on
untrained movements, we could not confirm that proprioceptive training had general effect on
the motor domain such as improving spatial precision of trajectories. However, we did observe
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
14 / 18


---

a generalized “sensory” effect. Learners who received additional vibro-tactile movement feed-
back during training, significantly reduced their reliance on haptic guidance feedback when
performing the untrained tracking task.
Finally, we found that the augmented feedback did not necessarily have to be provided to
the trained limb segment directly. That is, learning did not depend on providing vibro-tactile
feedback to the trained wrist. Learners who had received VTF to the contralateral limb equally
benefitted from it. Neither differences in motor measures (tracking error), nor sensory mea-
sures (magnitude of haptic feedback or proprioceptive acuity expressed by the matching error)
were observedwhen applying VTF to the forearm of the trained wrist joint or to the contralat-
eral forearm (see Fig 5). This implies that the applied movement trajectory feedback from
another somatosensory modality was salient during learning. However, it was not relevant
where the feedback was applied. It is possible that the underlying neural pathways that could
facilitate such transfer of somatosensory-basedmovement feedback are transcallosal projec-
tions from the primary or secondarysomatosensory cortices to homotopic and heterotopic
regions in the contralateral cortex [42], which, in turn, are known to project to motor cortical
areas [43]. In other words, VTF originating from the homologous region of the untrained arm
could reach motor cortical regions of the trained arm via projections crossing the corpus callo-
sum connecting the two cortical hemispheres.
This finding does have relevance to treatment regimen designed to retrain motor function
in people with somatosensory deficits due to neurological disease such as cortical stroke,
because it implies that training effects can be achieved by providing somatosensory feedback to
a less affected limb.
Conclusion
This study examined the trainability of the proprioceptive sense and explored the relationship
between proprioception and motor learning. It showed that proprioceptive acuity can be
enhanced significantly even with brief 3-day training and that such sensory change facilitates
motor learning. Its results document the effectiveness of proprioceptive training especially when
learning is coupled with tactile sensory cues that provide feedback about movement errors.
Given that restoring somatosensory and sensorimotor function is a main goal of proprioceptive
training when applied during rehabilitation (Aman et al. 2015), our results are promising. They
add to the increasing evidence that proprioceptive training enhances somatosensory and motor
learning (e.g. Wong et al. 2011, 2012; Vahdat et al. 2014) may become an effective behavioral
intervention for treating movement disorders.
Supporting Information
S1 Table. Assessment Variables. Values of the three assessment variables (Matching Error,
Haptic Feedback and Tracking Error) for each single subject in two phases: Pre training and
Post Training.
(PDF)
S2 Table. Training Variables. Values of the three training variables (Max Displacement,
Movement Time and Movement Units) for each single subject in two phases: Early training
and Late Training.
(PDF)
Author Contributions
Conceptualization: AC VS MS JK.
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
15 / 18


---

Data curation: AC VS.
Formal analysis: AC.
Funding acquisition: VS MS LM.
Investigation: AC VS MS JK.
Methodology:AC VS JK LM.
Project administration: AC VS JK.
Resources: VS MS LM.
Software: AC.
Supervision:VS MS JK.
Validation: AC VS.
Visualization: AC VS MS JK.
Writing – original draft: AC JK.
Writing – review& editing: AC VS MS JK LM.
References
1.
Nowak D a, Glasauer S, Hermsdorfer J. How predictive is grip force control in the complete absence of
somatosensory feedback? Brain [Internet]. 2004 Jan [cited 2015 Feb 10]; 127(Pt 1):182–92. Available:
http://www.ncbi.nlm.nih.gov/pubmed/14570822 doi: 10.1093/brain/awh016 PMID: 14570822
2.
Hermsdorfer J, Elias Z, Cole JD, Quaney BM, Nowak DA. Preserved and impaired aspects of feed-for-
ward grip force control after chronic somatosensory deafferentation. Neurorehabil Neural Repair.
2008; 22(4):374–84. doi: 10.1177/1545968307311103 PMID: 18223241
3.
Sainburg RL, Poizner H, Ghez C. Loss of proprioception produces deficits in interjoint coordination. J
Neurophysiol. 1993; 70(5):2136–47. PMID: 8294975
4.
Ghez C, Gordon J, Ghilardi MF. Impairments of reaching movements in patients without propriocep-
tion. II. Effects of visual information on accuracy. J Neurophysiol [Internet]. 1995 Jan 1; 73(1):361–72.
Available: http://jn.physiology.org/content/73/1/361.abstract PMID: 7714578
5.
Gordon J, Ghilardi MF, Ghez C. Impairments of reaching movements in patients without propriocep-
tion. I. Spatial errors. J Neurophysiol [Internet]. 1995 Jan 1; 73(1):347–60. Available: http://jn.
physiology.org/content/73/1/347 PMID: 7714577
6.
Rickards C, Cody FWJ. Proprioceptive control of wrist movements in Parkinson’s disease. Reduced
muscle vibration-induced errors. Brain. 1997; 120:977–90. PMID: 9217682
7.
Konczak J, Sciutti A, Avanzino L, Squeri V, Gori M, Masia L, et al. Parkinson’s disease accelerates
age-related decline in haptic perception by altering somatosensory integration. Brain [Internet]. 2012
Nov [cited 2015 Jan 10]; 135(Pt 11):3371–9. Available: http://www.ncbi.nlm.nih.gov/pubmed/
23169922 doi: 10.1093/brain/aws265 PMID: 23169922
8.
Putzki N, Stude P, Konczak J, Graf K, Diener H-C, Maschke M. Kinesthesia is impaired in focal dysto-
nia. Mov Disord [Internet]. 2006 Jun [cited 2015 Feb 10]; 21(6):754–60. Available: http://www.ncbi.
nlm.nih.gov/pubmed/16482525 doi: 10.1002/mds.20799 PMID: 16482525
9.
Carey LM, Matyas TA, Oke LE. Sensory loss in stroke patients: effective training of tactile and proprio-
ceptive discrimination. Arch Phys Med Rehabil. 1993 Jun; 74(6):602–11. doi: 10.1016/0003-9993(93)
90158-7 PMID: 8503750
10.
Cho S, Ku J, Cho YK, Kim IY, Kang YJ, Jang DP, et al. Development of virtual reality proprioceptive
rehabilitation system for stroke patients. Comput Methods Programs Biomed [Internet]. 2014 Jan
[cited 2014 Dec 10]; 113(1):258–65. Available: http://www.ncbi.nlm.nih.gov/pubmed/24183070 doi:
10.1016/j.cmpb.2013.09.006 PMID: 24183070
11.
Dukelow SP, Herter TM, Moore KD, Demers MJ, Glasgow JI, Bagg SD, et al. Quantitative assessment
of limb position sense following stroke. Neurorehabil Neural Repair [Internet]. 2010 Feb [cited 2014
Dec 8]; 24(2):178–87. Available: http://www.ncbi.nlm.nih.gov/pubmed/19794134 doi: 10.1177/
1545968309345267 PMID: 19794134
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
16 / 18


---

12.
Iandolo R, Squeri V, De Santis D, Giannoni P, Morasso P, Casadio M. Proprioceptive bimanual test in
intrinsic and extrinsic coordinates. Front Hum Neurosci [Internet]. 2015 Jan [cited 2015 Mar 11]; 9:72.
Available: http://www.pubmedcentral.nih.gov/articlerender.fcgi?artid=4332282&tool=
pmcentrez&rendertype=abstract doi: 10.3389/fnhum.2015.00072 PMID: 25741268
13.
De Santis D, Zenzeri J, Casadio M, Masia L, Riva A, Morasso P, et al. Robot-Assisted Training of the
Kinesthetic Sense: Enhancing Proprioception after Stroke. Front Hum Neurosci [Internet]. 2015; 8
(January):1–12. Available: http://journal.frontiersin.org/article/10.3389/fnhum.2014.01037/abstract
doi: 10.3389/fnhum.2014.01037 PMID: 25601833
14.
Goble DJ, Anguera J a. Plastic changes in hand proprioception following force-field motor learning. J
Neurophysiol. 2010; 104(3):1213–5. doi: 10.1152/jn.00543.2010 PMID: 20610787
15.
Wong JD, Wilson ET, Gribble PL. Spatially selective enhancement of proprioceptive acuity following
motor learning. J Neurophysiol [Internet]. 2011 May [cited 2014 Dec 10]; 105(5):2512–21. Available:
http://www.pubmedcentral.nih.gov/articlerender.fcgi?artid=3094168&tool=pmcentrez&rendertype=
abstract doi: 10.1152/jn.00949.2010 PMID: 21368000
16.
Wong JD, Kistemaker D a, Chin A, Gribble PL. Can proprioceptive training improve motor learning? J
Neurophysiol [Internet]. 2012 Dec [cited 2014 Dec 9]; 108(12):3313–21. Available: http://www.
pubmedcentral.nih.gov/articlerender.fcgi?artid=3544879&tool=pmcentrez&rendertype=abstract doi:
10.1152/jn.00122.2012 PMID: 22972960
17.
Aman JE, Elangovan N, Yeh I-L, Konczak J. The effectiveness of proprioceptive training for improving
motor function: a systematic review. Front Hum Neurosci [Internet]. 2015 Jan 28 [cited 2015 Feb 11]; 8
(January):1–18. Available: http://journal.frontiersin.org/journal/10.3389/fnhum.2014.01075/abstract
doi: 10.3389/fnhum.2014.01075 PMID: 25674059
18.
Huang H, Wolf SL, He J. Recent developments in biofeedback for neuromotor rehabilitation. J Neu-
roeng Rehabil [Internet]. 2006 Jan [cited 2014 Dec 4]; 3:11. Available: http://www.pubmedcentral.nih.
gov/articlerender.fcgi?artid=1550406&tool=pmcentrez&rendertype=abstract doi: 10.1186/1743-0003-
3-11 PMID: 16790060
19.
Wang W, Collinger JL, Perez MA, Tyler-Kabara EC, Cohen LG, Birbaumer N, et al. Neural interface
technology for rehabilitation: exploiting and promoting neuroplasticity. Phys Med Rehabil Clin N Am
[Internet]. 2010; 21(1):157–78. Available: http://www.pubmedcentral.nih.gov/articlerender.fcgi?artid=
2788507&tool=pmcentrez&rendertype=abstract doi: 10.1016/j.pmr.2009.07.003 PMID: 19951784
20.
Dijkerman C, De Haan E. Somatosensory Processes Subserving Perception and Action. Behav Brain
Sci. 2007; 30(2):189–239. doi: 10.1017/S0140525X07001392 PMID: 17705910
21.
Richer F, Martinez M, Robert M, Bouvier G. Body Displacement Perceptions in Medial Regions. Exp
brain Res. 1993; 93(1):173–6.
22.
Conrad MO, Scheidt R a, Schmit BD. Effects of wrist tendon vibration on targeted upper-arm move-
ments in poststroke hemiparesis. Neurorehabil Neural Repair [Internet]. 2011 Jan [cited 2014 Dec 10];
25(1):61–70. Available: http://www.ncbi.nlm.nih.gov/pubmed/20921324 doi: 10.1177/
1545968310378507 PMID: 20921324
23.
Sienko KH, Balkwill MD, Wall C. Biofeedback improves postural control recovery from multi-axis dis-
crete perturbations. J Neuroeng Rehabil [Internet]. 2012 Jan [cited 2015 Jan 9]; 9(1):53. Available:
http://www.pubmedcentral.nih.gov/articlerender.fcgi?artid=3477042&tool=pmcentrez&rendertype=
abstract doi: 10.1186/1743-0003-9-53 PMID: 22863399
24.
Wall C, Weinberg MS, Schmidt PB, Krebs DE. Balance prosthesis based on micromechanical sensors
using vibrotactile feedback of tilt. IEEE Trans Biomed Eng [Internet]. 2001 Oct; 48(10):1153–61. Avail-
able: http://www.ncbi.nlm.nih.gov/pubmed/11585039 doi: 10.1109/10.951518 PMID: 11585039
25.
Cuppone A, Squeri V, Semprini M, Konczak J. Robot—assisted training to improve proprioception
does benefit from added vibro—tactile feedback. In: 37th Annual International Conference of the IEEE
Engineering in Medicine and Biology Society (EMBC). Milan; 2015. p. 258–61.
26.
Masia L, Casadio M, Sandini G, Morasso P. Eye-hand coordination during dynamic visuomotor rota-
tions. PLoS One [Internet]. 2009 Jan [cited 2014 Dec 6]; 4(9):e7004. Available: http://www.
pubmedcentral.nih.gov/articlerender.fcgi?artid=2737429&tool=pmcentrez&rendertype=abstract doi:
10.1371/journal.pone.0007004 PMID: 19753120
27.
Goble DJ. Proprioceptive acuity assessment via joint position matching: from basic science to general
practice. Phys Ther [Internet]. 2010 Aug [cited 2015 Feb 21]; 90(8):1176–84. Available: http://www.
ncbi.nlm.nih.gov/pubmed/20522675 doi: 10.2522/ptj.20090399 PMID: 20522675
28.
Elangovan N, Herrmann A, Konczak J. Assessing proprioceptive function: evaluating joint position
matching methods against psychophysical thresholds. Phys Ther [Internet]. 2014 Apr [cited 2015 Feb
17]; 94(4):553–61. Available: http://www.ncbi.nlm.nih.gov/pubmed/24262599 doi: 10.2522/ptj.
20130103 PMID: 24262599
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
17 / 18


---

29.
Blanchard C, Roll R, Roll J-P, Kavounoudias A. Differential Contributions of Vision, Touch and Muscle
Proprioception to the Coding of Hand Movements. PLoS One [Internet]. 2013; 8(4):e62475. Available:
http://dx.plos.org/10.1371/journal.pone.0062475 doi: 10.1371/journal.pone.0062475 PMID: 23626826
30.
Blanchard C, Roll R, Roll J-P, Kavounoudias A. Combined contribution of tactile and proprioceptive
feedback to hand movement perception. Brain Res [Internet]. 2011 Mar 25 [cited 2014 Dec 2];
1382:219–29. Available: http://www.ncbi.nlm.nih.gov/pubmed/21276776 doi: 10.1016/j.brainres.2011.
01.066 PMID: 21276776
31.
Sciutti A, Squeri V, Gori M, Masia L, Sandini G, Konczak J. Predicted sensory feedback derived from
motor commands does not improve haptic sensitivity. Exp brain Res [Internet]. 2010 Jan [cited 2015
Feb 18]; 200(3–4):259–67. Available: http://www.ncbi.nlm.nih.gov/pubmed/19730840 doi: 10.1007/
s00221-009-1996-x PMID: 19730840
32.
Evarts E. Central control of movement. V. Feedback and corollary discharge: a merging of the con-
cepts. Neurosci Res Progr Bull. 1971; 9:86–112. PMID: 5161915
33.
Kawato M, Kuroda T, Imamizu H, Nakano E, Miyauchi S, Yoshioka T. Internal forward models in the
cerebellum: fMRI study on grip force and load force coupling. Prog Brain Res. 2003; 142:171–88. doi:
10.1016/S0079-6123(03)42013-X PMID: 12693261
34.
Holst E, Mittelstaedt H. Das Reafferenzprinzip. Naturwissenschaften. 1950; 37(20):464–76. doi: 10.
1007/BF00622503
35.
Wolpert DM, Kawato M. Multiple paired forward and inverse models for motor control. Vol. 11, Neural
Networks. 1998. p. 1317–29. doi: 10.1016/S0893-6080(98)00066-5 PMID: 12662752
36.
Bernardi NF, Darainy M, Bricolo E, Ostry DJ. Observing motor learning produces somatosensory
change. J Neurophysiol [Internet]. 2013; 110(8):1804–10. Available: http://www.ncbi.nlm.nih.gov/
pubmed/23864382 doi: 10.1152/jn.01061.2012 PMID: 23864382
37.
Mattar A a G, Darainy M, Ostry DJ. Motor learning and its sensory effects: time course of perceptual
change and its presence with gradual introduction of load. J Neurophysiol [Internet]. 2013; 109
(3):782–91. Available: http://www.pubmedcentral.nih.gov/articlerender.fcgi?artid=3567396&tool=
pmcentrez&rendertype=abstract doi: 10.1152/jn.00734.2011 PMID: 23136347
38.
Vahdat S, Darainy M, Ostry DJ. Structure of plasticity in human sensory and motor networks due to
perceptual learning. J Neurosci [Internet]. 2014; 34(7):2451–63. Available: http://www.ncbi.nlm.nih.
gov/pubmed/24523536 doi: 10.1523/JNEUROSCI.4291-13.2014 PMID: 24523536
39.
Heuer H, Lu¨ttgen J. Robot assistance of motor learning: A neuro-cognitive perspective. Neurosci Bio-
behav Rev [Internet]. 2015; 56:222–40. Available: http://www.sciencedirect.com/science/article/pii/
S0149763415001906 doi: 10.1016/j.neubiorev.2015.07.005 PMID: 26192105
40.
Heuer H, Rapp K. Haptic guidance interferes with learning to make movements at an angle to stimulus
direction. Exp brain Res [Internet]. 2014; 232(2):675–84. Available: http://www.ncbi.nlm.nih.gov/
pubmed/24276313 doi: 10.1007/s00221-013-3775-y PMID: 24276313
41.
Sigrist R, Rauter G, Riener R, Wolf P. Augmented visual, auditory, haptic, and multimodal feedback in
motor learning: a review. Psychon Bull Rev [Internet]. 2013 Feb [cited 2014 Sep 4]; 20(1):21–53. Avail-
able: http://www.ncbi.nlm.nih.gov/pubmed/23132605 doi: 10.3758/s13423-012-0333-8 PMID:
23132605
42.
Barbaresi P, Bernardi S, Manzoni T. Callosal connections of the somatic sensory areas II and IV in the
cat. J Comp Neurol. 1989; 283(3):355–73. doi: 10.1002/cne.902830305 PMID: 2745745
43.
Kaas JH. The functional organization of somatosensory cortex in primates. Ann Anat [Internet]. 1993;
175(6):509–18. Available: http://dx.doi.org/10.1016/S0940-9602(11)80212-8 doi: 10.1016/S0940-
9602(11)80212-8 PMID: 8297039
Robot-Assisted Proprioceptive Training and Sensorimotor Function
PLOS ONE | DOI:10.1371/journal.pone.0164511
October 11, 2016
18 / 18
