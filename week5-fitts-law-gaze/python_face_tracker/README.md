# Advanced Head-Controlled Mouse

This project implements a hands-free mouse interface using 3D head-tracking (MediaPipe) and gesture-based clicking. It includes an automated Fitts's Law experiment suite for performance analysis.

## Features
- **Head Tracking**: Smooth 2D cursor control via face bounding-box tracking.
- **Nguso Click**: Pucker your lips (Filipino 'Nguso' gesture) to trigger a mouse click.
- **Smoothing**: Exponential Moving Average (EMA) filter to eliminate jitter.
- **Experiment Suite**: Pygame-based tool to conduct Fitts's Law trials with automated data logging.
- **Analysis Script**: Generates scatter plots and regression equations for performance comparison.

## Quick Start

### 1. Installation
```bash
pip install -r requirements.txt
```

### 2. Run the Tracker
```bash
python face_tracker.py
```

### 3. Conduct Experiment
```bash
# For Head Control (face_tracker must be running)
python fitts_law_experiment.py Head

# For Mouse Control
python fitts_law_experiment.py Mouse
```

### 4. Analyze Results
```bash
python analyze_results.py --user [your_name]
```

## Project Structure
- `face_tracker.py`: Core tracking and gesture engine.
- `fitts_law_experiment.py`: Pygame experiment UI.
- `analyze_results.py`: Data analysis and plotting tool.
- `requirements.txt`: Python dependencies.
- `results/`: Organized experiment data by user.
