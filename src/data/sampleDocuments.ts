import { SampleDoc } from '../types/quiz';

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'solar-system',
    title: 'The Solar System & Planetary Dynamics',
    category: 'Astronomy & Physics',
    emoji: '🪐',
    description: 'Gas giants, terrestrial planets, orbital mechanics, and atmospheric compositions.',
    content: `THE SOLAR SYSTEM: ARCHITECTURE AND PLANETARY DYNAMICS

1. Architectural Hierarchy
The Solar System consists of our central star, the Sun (which holds 99.86% of the system's total mass), eight recognized major planets, at least five dwarf planets (including Pluto, Eris, Haumea, Makemake, and Ceres), hundreds of moons, and billions of smaller bodies like asteroids, comets, and meteoroids.

2. Terrestrial vs. Jovian Planets
Planets are split into two distinct categories:
- Terrestrial Planets (Mercury, Venus, Earth, Mars): High mean density (3.9 to 5.5 g/cm³), rocky silicate mantles, metallic iron-nickel cores, and solid surfaces. Venus possesses the thickest atmosphere among terrestrial bodies, composed of 96.5% carbon dioxide, producing a runaway greenhouse effect with surface temperatures around 465°C (hotter than Mercury, despite Mercury being closer to the Sun).
- Jovian Planets (Gas and Ice Giants):
  * Gas Giants (Jupiter, Saturn): Composed predominantly of hydrogen and helium. Jupiter is 2.5 times more massive than all other planets combined and exhibits the Great Red Spot, an anticyclonic storm lasting over 300 years.
  * Ice Giants (Uranus, Neptune): Contain mantles rich in "ices" (water, ammonia, methane). Uranus exhibits an extreme axial tilt of 97.77 degrees, essentially rotating on its side. Neptune displays the fastest supersonic winds in the solar system, exceeding 2,100 km/h.

3. Moons and Habitability
- Europa (Jupiter's moon): Harboring a subsurface salty liquid water ocean beneath a 15–25 km thick ice crust, warmed by tidal flexure from Jupiter's gravitational pull.
- Titan (Saturn's moon): The only moon known with a dense nitrogen-dominated atmosphere (1.5 bar surface pressure) and stable liquid hydrocarbon lakes of methane and ethane.
- Enceladus (Saturn's moon): Spews cryovolcanic geysers of water vapor, organic molecules, and salts into space from its south polar fractures ("tiger stripes").

4. Orbital Regions
- Asteroid Belt: Located between Mars and Jupiter (~2.2 to 3.2 AU). Ceres represents one-third of its total mass.
- Kuiper Belt: Extends beyond Neptune's orbit from 30 to 50 AU, populated by icy planetesimals and dwarf planets.
- Oort Cloud: A theoretical spherical reservoir of trillions of icy comets extending up to 100,000 AU from the Sun, defining the gravitational boundary of the solar system.`,
  },
  {
    id: 'cellular-biology',
    title: 'Cellular Respiration & Mitochondria',
    category: 'Biological Sciences',
    emoji: '🧬',
    description: 'ATP generation, glycolysis, the Krebs citric acid cycle, and oxidative phosphorylation.',
    content: `CELLULAR RESPIRATION AND BIOENERGETICS

1. Overview of ATP Generation
Cellular respiration is the biochemical pathway through which eukaryotic and prokaryotic cells harvest biochemical energy from nutrient molecules (primarily glucose) to synthesize Adenosine Triphosphate (ATP). The balanced overall equation for aerobic respiration is:
C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ~30-32 ATP

2. The Four Stages of Respiration
Stage 1: Glycolysis
- Location: Cytoplasm (cytosol). Does NOT require molecular oxygen (anaerobic).
- Process: One 6-carbon glucose molecule is cleaved into two 3-carbon pyruvate molecules.
- Net Yield: 2 ATP (via substrate-level phosphorylation) and 2 NADH.

Stage 2: Pyruvate Oxidation (Link Reaction)
- Location: Mitochondrial matrix.
- Process: Each pyruvate enters the matrix, loses one carbon as CO2, and joins Coenzyme A to form Acetyl-CoA.
- Net Yield per glucose: 2 Acetyl-CoA, 2 NADH, and 2 CO2.

Stage 3: Citric Acid Cycle (Krebs Cycle)
- Location: Mitochondrial matrix.
- Process: Acetyl-CoA (2C) combines with Oxaloacetate (4C) to create Citrate (6C). Through a sequence of 8 enzymatic steps, 2 carbons are oxidized as CO2, regenerating oxaloacetate.
- Net Yield per glucose: 2 ATP (or GTP), 6 NADH, 2 FADH2, and 4 CO2.

Stage 4: Oxidative Phosphorylation & Chemiosmosis
- Location: Inner mitochondrial membrane (cristae).
- Electron Transport Chain (ETC): Electrons from NADH and FADH2 flow through protein complexes (Complex I, II, III, IV), reducing O2 (the terminal electron acceptor) to H2O.
- Proton Gradient: Electron transport drives the pumping of H+ ions from the matrix into the intermembrane space, creating a steep electrochemical proton gradient (proton-motive force).
- ATP Synthase: Protons flow down their concentration gradient back into the matrix through the rotor subunits of ATP Synthase, driving the mechanical phosphorylation of ADP + Pi into ATP. Yields ~26–28 ATP.

3. Anaerobic Fermentation
In the absence of oxygen, cells must regenerate NAD+ from NADH to keep glycolysis running.
- Lactic Acid Fermentation: Occurs in vertebrate skeletal muscle during intense anaerobic exertion; pyruvate is reduced directly to lactate by lactate dehydrogenase.
- Ethanol Fermentation: Occurs in yeasts; pyruvate is converted to acetaldehyde and then ethanol, releasing CO2.`,
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning & Neural Architecture',
    category: 'Computer Science & AI',
    emoji: '⚡',
    description: 'Loss functions, gradient descent, overfitting, regularizations, and attention mechanisms.',
    content: `FOUNDATIONS OF MACHINE LEARNING AND DEEP LEARNING

1. Supervised, Unsupervised, and Reinforcement Paradigms
- Supervised Learning: Models learn a mapping function f(X) -> Y from paired labeled input-output instances (e.g., classification, regression).
- Unsupervised Learning: Uncovers latent intrinsic patterns or clusters without external ground-truth labels (e.g., K-Means clustering, PCA, autoencoders).
- Reinforcement Learning: An agent navigates an environment, executing actions to maximize cumulative expected rewards according to a Markov Decision Process (MDP).

2. Model Training Dynamics
- Loss Functions:
  * Mean Squared Error (MSE): Typically utilized for continuous regression targets.
  * Cross-Entropy Loss: Measures divergence between true categorical distributions and predicted probability logits for classification.
- Gradient Descent: Optimization algorithm that iteratively updates model weights W in the opposite direction of the gradient of the loss surface:
  W_new = W_old - (alpha * grad_W L), where alpha is the learning rate.
- Backpropagation: Efficient application of the multivariable calculus chain rule to compute partial derivatives of loss with respect to every weight parameter in reverse topological order.

3. The Bias-Variance Tradeoff & Generalization
- High Bias (Underfitting): Model is overly simplistic and cannot capture underlying data distributions (high training and validation error).
- High Variance (Overfitting): Model memorizes training noise and fails to generalize to unseen test distributions (low training error, high validation error).
- Regularization Remedies:
  * L2 Regularization (Ridge / Weight Decay): Penalizes the sum of squared weights, shrinking them smoothly toward zero.
  * L1 Regularization (Lasso): Penalizes the absolute values of weights, driving non-essential coefficients to zero (sparse feature selection).
  * Dropout: Randomly zeros out a fraction p of hidden neuron activations during forward passes, mitigating co-adaptation.

4. The Transformer Architecture
Introduced in Vaswani et al. (2017), the Transformer discarded recurrent sequential processing (RNNs/LSTMs) in favor of Self-Attention:
Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V
This enables global context modeling across entire sequences in parallel, serving as the architectural foundation of contemporary Large Language Models (LLMs).`,
  },
  {
    id: 'silk-road',
    title: 'The Silk Road & Eurasian Cultural Exchange',
    category: 'World History',
    emoji: '🏺',
    description: 'Trans-continental trade routes, commodity flows, technological diffusion, and caravan cities.',
    content: `THE SILK ROAD: TRANSCONTINENTAL COMMERCE AND CULTURAL TRANSMISSION

1. Origins and Geography
The Silk Road was not a single paved road, but rather an intricate network of overland trade routes and maritime corridors spanning over 6,400 kilometers (4,000 miles) that connected Han Dynasty China to the Mediterranean Basin, passing through Central Asia, Persia, and the Levant.
The overland routes were formally consolidated during the Han Dynasty (specifically initiated around 138 BCE under Emperor Wu of Han, following the diplomatic expedition of explorer Zhang Qian).

2. Commodities and Material Exchange
- Outbound from China: High-grade silk (which the Roman Senate famously attempted to ban due to lavish currency drains), fine porcelain, lacquerware, iron tools, and tea.
- Inbound to China: Ferghana horses ("Heavenly Horses" prized for cavalry warfare), Roman glassware, lapis lazuli from Badakhshan, frankincense from southern Arabia, grapes, alfalfa, and walnuts.

3. Intellectual and Technological Diffusion
Far more consequential than material goods was the transmission of groundbreaking technologies and philosophies:
- Papermaking: Invented in China by Cai Lun in 105 CE, the secret of papermaking spread to the Islamic world following the Battle of Talas in 751 CE (near modern-day Kyrgyzstan). Samarkand became the world's premier paper manufacturing hub, eventually transmitting the craft to Moorish Spain and Europe.
- Gunpowder and the Magnetic Compass: Diffused westward along Eurasian trade networks over subsequent centuries, fundamentally revolutionizing navigation and military strategy.
- Sericulture: The secrets of silkworm cultivation were closely guarded by imperial decree, but were smuggled westward into Khotan and eventually to the Byzantine Empire around 552 CE by Christian monks concealing silkworm eggs in hollow bamboo canes.

4. Religious and Ideological Diffusion
- Buddhism: Traveled along the northern Silk Road from northern India into Central Asia and China through oasis kingdoms like Dunhuang (famed for the Mogao Caves) and Khotan.
- Nestorian Christianity and Manichaeism: Traveled east across Central Asia, with the Tang Dynasty capital of Chang'an (Xi'an) establishing Nestorian monuments by 635 CE.

5. Caravan Infrastructure and Sogdian Merchants
The Sogdians, an Iranian merchant civilization based in cities like Samarkand and Bukhara, operated as the indispensable middlemen of overland trade. Caravans traveled from one caravansary (roadside fortified inns spaced approximately one day's camel travel apart, ~30-40 km) to the next, trading goods at regional markets rather than individual merchants journeying the entire length of Eurasia.`,
  },
];
