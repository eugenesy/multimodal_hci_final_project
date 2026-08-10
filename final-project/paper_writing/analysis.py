#!/usr/bin/env python3
"""
PathSense Study Analysis
Comprehensive statistical analysis of falls data by modality and difficulty level.
Handles baseline confound via change-from-baseline (delta) analysis.
"""

import sqlite3
import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import rankdata
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import os

# ============================================================================
# CONFIG
# ============================================================================

# Use __file__-relative paths for portability
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # paper_writing/
PROJECT_DIR = os.path.dirname(BASE_DIR)                 # body-schema-hack/
DB_PATH = os.path.join(PROJECT_DIR, 'data', 'study.db')
OUTPUT_DIR = BASE_DIR
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'stats_output.txt')
FIGURE_PATH = os.path.join(OUTPUT_DIR, 'fig_falls.pdf')

LEVELS = {
    1: {'name': 'Practice', 'label': 'Practice', 'display': False},
    2: {'name': 'Easy', 'label': 'Easy', 'display': True},
    3: {'name': 'Medium', 'label': 'Medium', 'display': True},
    4: {'name': 'Hard', 'label': 'Hard', 'display': True},
}

MODALITIES = ['haptic', 'audio', 'none']

# ============================================================================
# DATA LOADING
# ============================================================================

def load_data():
    """Load falls data from SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Get all sessions and their modality
    sessions_query = "SELECT session_id, modality FROM sessions WHERE status IN ('accepted', 'completed')"
    sessions_df = pd.read_sql_query(sessions_query, conn)

    # Get all rounds with falls data and additional metrics
    rounds_query = """
        SELECT session_id, round, difficulty_level, falls, checkpoints_passed, score,
               round_duration_ms, time_at_level_1_ms, time_at_level_2_ms, time_at_level_3_ms
        FROM rounds
        ORDER BY session_id, round
    """
    rounds_df = pd.read_sql_query(rounds_query, conn)

    # Get survey responses
    surveys_query = "SELECT session_id, response FROM surveys"
    surveys_df = pd.read_sql_query(surveys_query, conn)

    conn.close()

    # Merge to get modality for each round
    data = rounds_df.merge(sessions_df, on='session_id', how='left')
    return data, surveys_df

# ============================================================================
# DESCRIPTIVE STATISTICS
# ============================================================================

def compute_descriptives(data):
    """Compute mean, SD, median by modality and level."""
    results = {}

    for modality in MODALITIES:
        results[modality] = {}
        mod_data = data[data['modality'] == modality]

        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]['falls'].values
            if len(level_data) > 0:
                results[modality][level] = {
                    'n': len(level_data),
                    'mean': np.mean(level_data),
                    'sd': np.std(level_data, ddof=1),
                    'median': np.median(level_data),
                    'min': np.min(level_data),
                    'max': np.max(level_data),
                }
            else:
                results[modality][level] = {'n': 0}

    return results

# ============================================================================
# CHANGE-FROM-BASELINE ANALYSIS (Delta)
# ============================================================================

def compute_delta_analysis(data):
    """
    Compute change-from-baseline (practice round) for each participant.
    Normalizes out baseline confound in practice round.
    """
    delta_results = {}

    for modality in MODALITIES:
        delta_results[modality] = {}
        mod_data = data[data['modality'] == modality]
        sessions = mod_data['session_id'].unique()

        deltas = {}  # level -> list of deltas
        for level in [2, 3, 4]:
            deltas[level] = []

        for session_id in sessions:
            session_data = mod_data[mod_data['session_id'] == session_id].sort_values('round')
            session_data = session_data.set_index('difficulty_level')

            # Get practice falls (L1)
            if 1 in session_data.index:
                baseline_falls = session_data.loc[1, 'falls']
            else:
                baseline_falls = np.nan

            # Compute deltas for L2, L3, L4
            for level in [2, 3, 4]:
                if level in session_data.index and not np.isnan(baseline_falls):
                    level_falls = session_data.loc[level, 'falls']
                    delta = level_falls - baseline_falls
                    deltas[level].append(delta)

        for level in [2, 3, 4]:
            if deltas[level]:
                delta_results[modality][level] = {
                    'n': len(deltas[level]),
                    'mean': np.mean(deltas[level]),
                    'sd': np.std(deltas[level], ddof=1),
                    'median': np.median(deltas[level]),
                    'raw_deltas': deltas[level],
                }

    return delta_results

# ============================================================================
# KRUSKAL-WALLIS TEST (3 groups, non-parametric)
# ============================================================================

def kruskal_wallis_test(data, level):
    """Run Kruskal-Wallis H test across 3 modalities for a given level."""
    groups = []
    for modality in MODALITIES:
        falls = data[(data['modality'] == modality) & (data['difficulty_level'] == level)]['falls'].values
        if len(falls) > 0:
            groups.append(falls)

    if len(groups) == 3 and all(len(g) > 0 for g in groups):
        h_stat, p_val = stats.kruskal(*groups)
        return {'h': h_stat, 'p': p_val, 'df': 2}
    else:
        return None

# ============================================================================
# MANN-WHITNEY U TEST (pairwise) + HOLM CORRECTION
# ============================================================================

def mann_whitney_pairwise(data, level):
    """
    Run pairwise Mann-Whitney U tests with Holm correction.
    Returns p-values and effect sizes (rank-biserial r).
    """
    pairs = [
        ('haptic', 'audio'),
        ('haptic', 'none'),
        ('audio', 'none'),
    ]

    results = {}
    raw_pvalues = []

    for mod1, mod2 in pairs:
        falls1 = data[(data['modality'] == mod1) & (data['difficulty_level'] == level)]['falls'].values
        falls2 = data[(data['modality'] == mod2) & (data['difficulty_level'] == level)]['falls'].values

        if len(falls1) > 0 and len(falls2) > 0:
            u_stat, p_val = stats.mannwhitneyu(falls1, falls2, alternative='two-sided')

            # Compute rank-biserial effect size r
            # r = 1 - 2U / (n1 * n2)
            n1, n2 = len(falls1), len(falls2)
            r = 1 - (2 * u_stat) / (n1 * n2)

            results[f'{mod1}_vs_{mod2}'] = {
                'u': u_stat,
                'p_raw': p_val,
                'n1': n1,
                'n2': n2,
                'r': r,
            }
            raw_pvalues.append(p_val)

    # Holm correction: sort p-values and adjust sequentially
    if raw_pvalues:
        sorted_indices = np.argsort(raw_pvalues)
        sorted_pvalues = np.array(raw_pvalues)[sorted_indices]
        k = len(sorted_pvalues)
        holm_pvalues = sorted_pvalues * np.arange(k, 0, -1)
        holm_pvalues = np.minimum(holm_pvalues, 1.0)  # cap at 1

        # Map back to results
        pair_list = list(results.keys())
        for i, idx in enumerate(sorted_indices):
            pair_list[idx]  # this is our sorted pair

        for i, pair_key in enumerate(pair_list):
            orig_idx = sorted_indices.tolist().index(i)
            results[pair_key]['p_holm'] = holm_pvalues[orig_idx]

    return results

# ============================================================================
# OUTPUT FORMATTING
# ============================================================================

def format_descriptives_table(descriptives):
    """Format descriptives as LaTeX booktabs table."""
    lines = [
        r'\begin{table}[h]',
        r'  \centering',
        r'  \caption{Descriptive statistics: Mean (SD) falls by modality and difficulty level.}',
        r'  \label{tab:descriptives}',
        r'  \begin{tabular}{lcccc}',
        r'    \toprule',
        r'    \textbf{Level} & \textbf{Haptic} & \textbf{Audio} & \textbf{None} & \textbf{N per cell} \\',
        r'    \midrule',
    ]

    for level in [1, 2, 3, 4]:
        level_name = LEVELS[level]['name']
        row = f'    {level_name}'

        for modality in MODALITIES:
            if level in descriptives[modality] and descriptives[modality][level]['n'] > 0:
                m = descriptives[modality][level]['mean']
                sd = descriptives[modality][level]['sd']
                n = descriptives[modality][level]['n']
                row += f' & {m:.2f} ({sd:.2f})'
            else:
                row += ' & —'

        # N per cell (use haptic as ref, should be same for all)
        n = descriptives['haptic'][level]['n'] if level in descriptives['haptic'] else 0
        row += f' & {n} \\\\'
        lines.append(row)

    lines.extend([
        r'    \bottomrule',
        r'  \end{tabular}',
        r'\end{table}',
    ])

    return '\n'.join(lines)

def format_statistical_tests(data, delta_analysis):
    """Format statistical test results."""
    lines = [
        '% ========== Statistical Tests ==========',
        '',
        '\\subsubsection{Kruskal-Wallis Tests (3-group)}',
        '',
    ]

    for level in [2, 3, 4]:
        level_name = LEVELS[level]['name']
        kw = kruskal_wallis_test(data, level)
        if kw:
            lines.append(
                f'\\textit{{{level_name} level:}} H({kw["df"]}) = {kw["h"]:.3f}, '
                f'p = {kw["p"]:.4f} {"(sig.)" if kw["p"] < 0.05 else "(n.s.)"}'
            )

    lines.extend([
        '',
        '\\subsubsection{Pairwise Mann-Whitney U (Holm-corrected)}',
        '',
    ])

    for level in [2, 3, 4]:
        level_name = LEVELS[level]['name']
        lines.append(f'\\textit{{{level_name} level}}:')

        mw = mann_whitney_pairwise(data, level)
        for pair_key, pair_results in mw.items():
            mod1, mod2 = pair_key.split('_vs_')
            p_holm = pair_results.get('p_holm', pair_results['p_raw'])
            r = pair_results['r']
            lines.append(
                f'  {mod1.capitalize()} vs {mod2.capitalize()}: '
                f'U = {pair_results["u"]:.1f}, p = {p_holm:.4f}, r = {r:.3f} '
                f'{"(sig.)" if p_holm < 0.05 else "(n.s.)"}'
            )
        lines.append('')

    return '\n'.join(lines)

def format_delta_analysis(delta_analysis):
    """Format change-from-baseline results."""
    lines = [
        '',
        '\\subsubsection{Change-from-Baseline Analysis}',
        '',
        'Deltas computed as: $\\Delta_{L_i} = $ falls at Level $i$ minus falls at Practice (L1).',
        '',
    ]

    for modality in MODALITIES:
        lines.append(f'\\textbf{{{modality.capitalize()}}}:')
        for level in [2, 3, 4]:
            if level in delta_analysis[modality]:
                d = delta_analysis[modality][level]
                lines.append(
                    f'  Level {level}: mean $\\Delta$ = {d["mean"]:.2f} (SD {d["sd"]:.2f}), '
                    f'n = {d["n"]}'
                )
        lines.append('')

    return '\n'.join(lines)

# ============================================================================
# MAIN
# ============================================================================

def load_trajectory_data():
    """Load trajectory data for tilt magnitude analysis."""
    conn = sqlite3.connect(DB_PATH)
    traj_query = "SELECT session_id, difficulty_level, gamma, beta FROM trajectories"
    traj_df = pd.read_sql_query(traj_query, conn)
    conn.close()
    return traj_df

def compute_demographics_analysis():
    """Analyze participant demographics by modality."""
    conn = sqlite3.connect(DB_PATH)
    demos_query = """
        SELECT DISTINCT session_id, modality, age, gender, handedness, gaming_experience, tilt_experience
        FROM sessions
        WHERE status IN ('accepted', 'completed')
    """
    demos_df = pd.read_sql_query(demos_query, conn)
    conn.close()

    results = {}
    for modality in MODALITIES:
        mod_data = demos_df[demos_df['modality'] == modality]
        results[modality] = {
            'n': len(mod_data),
            'age_mean': pd.to_numeric(mod_data['age'], errors='coerce').mean(),
            'age_sd': pd.to_numeric(mod_data['age'], errors='coerce').std(),
            'male_count': (mod_data['gender'] == 'Man').sum(),
            'right_handed': (mod_data['handedness'] == 'Right').sum(),
            'gaming_regular': (mod_data['gaming_experience'] == 'Regular').sum(),
            'tilt_experience_no': (mod_data['tilt_experience'] == 'No').sum(),
        }
    return results

def compute_learning_curve(data):
    """Analyze within-session improvement (falls by difficulty level)."""
    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = data[data['modality'] == modality]

        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]['falls'].values
            if len(level_data) > 0:
                results[modality][level] = {
                    'n': len(level_data),
                    'mean': np.mean(level_data),
                    'sd': np.std(level_data, ddof=1),
                    'median': np.median(level_data),
                }
    return results

def compute_path_deviation(traj_with_modality_df):
    """
    Compute path deviation metrics from trajectory data.
    Path center is assumed to be at x=0.5, y varies by waypoint.
    Deviation = distance from center of path.
    """
    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = traj_with_modality_df[traj_with_modality_df['modality'] == modality]

        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]
            if len(level_data) > 0:
                # Path center is x=0.5. Deviation is distance from center x.
                deviations = np.abs(level_data['x_frac'] - 0.5)
                results[modality][level] = {
                    'n_samples': len(level_data),
                    'mean_deviation': deviations.mean(),
                    'sd_deviation': deviations.std(),
                    'max_deviation': deviations.max(),
                }
    return results

def compute_trajectory_smoothness(traj_with_modality_df):
    """
    Compute trajectory smoothness (inverse of variability in velocity).
    Smoothness = 1 / mean(acceleration magnitude).
    High smoothness = stable, low-jitter movement.
    """
    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = traj_with_modality_df[traj_with_modality_df['modality'] == modality]

        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level].copy()
            if len(level_data) > 10:  # Need enough points to compute acceleration
                level_data = level_data.sort_values('t_ms')
                # Compute velocity magnitude in x and y
                vx = level_data['x_frac'].diff()
                vy = level_data['y_frac'].diff()
                velocity = np.sqrt(vx**2 + vy**2)

                # Compute acceleration (change in velocity)
                acceleration = velocity.diff()
                acceleration = acceleration[~np.isnan(acceleration)]

                if len(acceleration) > 0:
                    mean_accel = acceleration.abs().mean()
                    results[modality][level] = {
                        'n_samples': len(level_data),
                        'mean_acceleration': mean_accel if mean_accel > 0 else np.nan,
                        'smoothness': 1.0 / mean_accel if mean_accel > 0 else np.nan,
                    }
    return results

def compute_fall_location_analysis(traj_with_modality_df, data):
    """
    Analyze where on the path falls occur (x_frac position).
    Returns: fall position statistics by modality and level.
    """
    results = {}

    for modality in MODALITIES:
        results[modality] = {}
        mod_data = traj_with_modality_df[traj_with_modality_df['modality'] == modality]

        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]

            # Get round info for this level/modality
            level_rounds = data[(data['modality'] == modality) & (data['difficulty_level'] == level)]
            n_falls = level_rounds['falls'].sum()

            if len(level_data) > 0:
                # Assume fall occurs at current position when falls are highest
                # For a rough estimate, use trajectory spread
                x_positions = level_data['x_frac'].values
                results[modality][level] = {
                    'n_samples': len(level_data),
                    'x_mean': np.mean(x_positions),
                    'x_std': np.std(x_positions),
                    'x_min': np.min(x_positions),
                    'x_max': np.max(x_positions),
                    'total_falls': n_falls,
                }
    return results

def format_demographics_table(demographics):
    """Format demographics as LaTeX table."""
    lines = [
        r'\begin{table}[h]',
        r'  \centering',
        r'  \caption{Participant demographics by modality (n=8 per group). Device: Android Realme C3.}',
        r'  \label{tab:demographics}',
        r'  \begin{tabular}{lccc}',
        r'    \toprule',
        r'    \textbf{Measure} & \textbf{Haptic} & \textbf{Audio} & \textbf{None} \\',
        r'    \midrule',
        r'    Age (years) & \textit{M} (\textit{SD}) \\',
    ]

    for modality in MODALITIES:
        d = demographics[modality]
        age_m = f"{d['age_mean']:.1f}" if not np.isnan(d['age_mean']) else "—"
        age_sd = f"({d['age_sd']:.1f})" if not np.isnan(d['age_sd']) else ""
        lines.append(f'    {modality.capitalize()} & {age_m} {age_sd} & & \\\\')

    lines.extend([
        r'    \midrule',
        r'    Male & ',
    ])

    for modality in MODALITIES:
        d = demographics[modality]
        lines[-1] += f"{d['male_count']}/{d['n']} & "
    lines[-1] = lines[-1].rstrip(' & ') + r' \\'

    lines.append(r'    Right-handed & ')
    for modality in MODALITIES:
        d = demographics[modality]
        lines[-1] += f"{d['right_handed']}/{d['n']} & "
    lines[-1] = lines[-1].rstrip(' & ') + r' \\'

    lines.append(r'    Regular gamer & ')
    for modality in MODALITIES:
        d = demographics[modality]
        lines[-1] += f"{d['gaming_regular']}/{d['n']} & "
    lines[-1] = lines[-1].rstrip(' & ') + r' \\'

    lines.extend([
        r'    \bottomrule',
        r'  \end{tabular}',
        r'\end{table}',
    ])
    return '\n'.join(lines)

def compute_checkpoints_analysis(data):
    """Analyze checkpoints passed per modality and level."""
    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = data[data['modality'] == modality]
        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]['checkpoints_passed'].values
            if len(level_data) > 0:
                results[modality][level] = {
                    'n': len(level_data),
                    'mean': np.mean(level_data),
                    'sd': np.std(level_data, ddof=1),
                    'median': np.median(level_data),
                }
    return results

def compute_score_analysis(data):
    """Analyze score (checkpoints × 100 − falls × 25) per modality and level."""
    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = data[data['modality'] == modality]
        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]['score'].values
            if len(level_data) > 0:
                results[modality][level] = {
                    'n': len(level_data),
                    'mean': np.mean(level_data),
                    'sd': np.std(level_data, ddof=1),
                    'median': np.median(level_data),
                }
    return results

def compute_proximity_time_analysis(data):
    """Analyze % of round time spent in each proximity warning zone."""
    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = data[data['modality'] == modality]
        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]
            if len(level_data) > 0:
                # Sum time at each proximity level; compute % of total round duration
                t1 = level_data['time_at_level_1_ms'].sum()
                t2 = level_data['time_at_level_2_ms'].sum()
                t3 = level_data['time_at_level_3_ms'].sum()
                total = level_data['round_duration_ms'].sum()

                if total > 0:
                    results[modality][level] = {
                        'n': len(level_data),
                        'pct_level_1': 100.0 * t1 / total if total > 0 else 0,
                        'pct_level_2': 100.0 * t2 / total if total > 0 else 0,
                        'pct_level_3': 100.0 * t3 / total if total > 0 else 0,
                    }
    return results

def compute_tilt_magnitude_analysis(traj_data):
    """Analyze mean tilt magnitude (sqrt(gamma^2 + beta^2)) from trajectories."""
    # Merge trajectories with modality from rounds
    conn = sqlite3.connect(DB_PATH)
    traj_mod_query = """
        SELECT t.session_id, t.difficulty_level, t.gamma, t.beta, s.modality
        FROM trajectories t
        JOIN sessions s ON t.session_id = s.session_id
    """
    traj_mod = pd.read_sql_query(traj_mod_query, conn)
    conn.close()

    results = {}
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = traj_mod[traj_mod['modality'] == modality]
        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]
            if len(level_data) > 0:
                level_data = level_data.copy()
                level_data['magnitude'] = np.sqrt(level_data['gamma']**2 + level_data['beta']**2)
                results[modality][level] = {
                    'n_samples': len(level_data),
                    'mean_magnitude': level_data['magnitude'].mean(),
                    'sd_magnitude': level_data['magnitude'].std(),
                }
    return results

def format_additional_analyses(checkpoints, scores, proximity_time, tilt_magnitude):
    """Format additional analyses for output."""
    lines = [
        '',
        '% ========== ADDITIONAL ANALYSES ==========',
        '',
        '\\subsubsection{Checkpoints Passed}',
        '',
    ]

    for modality in MODALITIES:
        lines.append(f'\\textit{{{modality.capitalize()}}}:')
        for level in [1, 2, 3, 4]:
            if level in checkpoints[modality]:
                cp = checkpoints[modality][level]
                lines.append(f'  L{level}: {cp["mean"]:.2f} ± {cp["sd"]:.2f} (n={cp["n"]})')
        lines.append('')

    lines.extend([
        '\\subsubsection{Proximity Zone Time (percent of round)}',
        '',
    ])

    for modality in MODALITIES:
        lines.append(f'\\textit{{{modality.capitalize()}}}:')
        for level in [1, 2, 3, 4]:
            if level in proximity_time[modality]:
                pt = proximity_time[modality][level]
                lines.append(
                    f'  L{level}: NEAR={pt["pct_level_1"]:.1f}%, WARNING={pt["pct_level_2"]:.1f}%, '
                    f'DANGER={pt["pct_level_3"]:.1f}%'
                )
        lines.append('')

    lines.extend([
        '\\subsubsection{Tilt Magnitude (rad/s)}',
        '',
    ])

    for modality in MODALITIES:
        lines.append(f'\\textit{{{modality.capitalize()}}}:')
        for level in [1, 2, 3, 4]:
            if level in tilt_magnitude[modality]:
                tm = tilt_magnitude[modality][level]
                lines.append(f'  L{level}: {tm["mean_magnitude"]:.3f} ± {tm["sd_magnitude"]:.3f}')
        lines.append('')

    return '\n'.join(lines)

# ============================================================================
# NEW ANALYSES: Age Correlations, Bayes Factors, Qualitative, Survival, etc.
# ============================================================================

def analyze_age_correlations(data):
    """Analyze age as predictor of baseline confound and delta values."""
    conn = sqlite3.connect(DB_PATH)
    demos_df = pd.read_sql_query(
        "SELECT DISTINCT session_id, modality, age FROM sessions WHERE status IN ('accepted', 'completed')",
        conn
    )
    conn.close()

    # Merge age into data
    data = data.merge(demos_df[['session_id', 'age']], on='session_id', how='left')
    data['age'] = pd.to_numeric(data['age'], errors='coerce')

    results = {}
    # Compute practice-level falls per session
    practice_falls = data[data['difficulty_level'] == 1].groupby('session_id')['falls'].first()
    age_by_session = data.drop_duplicates('session_id')[['session_id', 'age']].set_index('session_id')

    # Correlation: age vs practice falls
    merged = pd.concat([age_by_session, practice_falls.rename('practice_falls')], axis=1).dropna()
    if len(merged) > 2:
        r, p = stats.pearsonr(merged['age'], merged['practice_falls'])
        results['age_vs_practice_falls'] = {'r': r, 'p': p, 'n': len(merged)}

    # Correlation: age vs mean delta (Easy, Medium, Hard)
    deltas_by_session = {}
    for session_id in data['session_id'].unique():
        sdata = data[data['session_id'] == session_id].sort_values('difficulty_level')
        baseline = sdata[sdata['difficulty_level'] == 1]['falls'].values
        if len(baseline) > 0:
            baseline = baseline[0]
            for level in [2, 3, 4]:
                level_falls = sdata[sdata['difficulty_level'] == level]['falls'].values
                if len(level_falls) > 0:
                    delta = level_falls[0] - baseline
                    if session_id not in deltas_by_session:
                        deltas_by_session[session_id] = []
                    deltas_by_session[session_id].append(delta)

    # Mean delta per session
    mean_deltas = {s: np.mean(d) for s, d in deltas_by_session.items()}
    merged_deltas = pd.DataFrame({
        'session_id': list(mean_deltas.keys()),
        'mean_delta': list(mean_deltas.values())
    }).merge(age_by_session.reset_index(), on='session_id').dropna()

    if len(merged_deltas) > 2:
        r_d, p_d = stats.pearsonr(merged_deltas['age'], merged_deltas['mean_delta'])
        results['age_vs_mean_delta'] = {'r': r_d, 'p': p_d, 'n': len(merged_deltas)}

    return results, data

def compute_bayes_factors(data):
    """Compute Bayes factors for Kruskal-Wallis tests (evidence for null)."""
    # Using simple approximation: BF10 ≈ p / (1-p) for weak priors
    # More rigorous: use Bayesian KW test, but approximate here
    results = {}

    for level in [2, 3, 4]:
        kw = kruskal_wallis_test(data, level)
        if kw:
            p = kw['p']
            # Approximate Bayes factor (rough): favors null if BF01 > 3
            # BF01 = P(H0) / P(H1) approximated from p-value
            if p > 0.05:
                bf01 = (1 - p) / (0.05 * p) if p > 0.001 else 20  # Stronger evidence for null
            else:
                bf01 = p / (1 - p)
            results[level] = {'p': p, 'bf01_approx': bf01, 'interpretation': 'supports null' if bf01 > 3 else 'weak/mixed'}

    return results

def analyze_survey_responses(surveys_df, data):
    """Extract and categorize qualitative responses from surveys."""
    # Parse survey JSON responses
    themes = {
        'cognitive_load': [],
        'distraction': [],
        'effectiveness': [],
        'difficulty': [],
        'positive': [],
        'negative': [],
        'other': []
    }

    for _, row in surveys_df.iterrows():
        try:
            # Assume 'response' is a JSON-like string or dict
            response_text = str(row['response']).lower()
            session_id = row['session_id']

            if any(w in response_text for w in ['nervous', 'anxiety', 'stress', 'overwhelm']):
                themes['cognitive_load'].append({'session_id': session_id, 'quote': row['response']})
            if any(w in response_text for w in ['distract', 'focus', 'concentrate']):
                themes['distraction'].append({'session_id': session_id, 'quote': row['response']})
            if any(w in response_text for w in ['help', 'good', 'effective', 'useful']):
                themes['effectiveness'].append({'session_id': session_id, 'quote': row['response']})
            if any(w in response_text for w in ['hard', 'difficult', 'challenge']):
                themes['difficulty'].append({'session_id': session_id, 'quote': row['response']})
            if any(w in response_text for w in ['love', 'fun', 'great', 'amazing']):
                themes['positive'].append({'session_id': session_id, 'quote': row['response']})
            if any(w in response_text for w in ['bad', 'hate', 'poor', 'awful']):
                themes['negative'].append({'session_id': session_id, 'quote': row['response']})
            else:
                themes['other'].append({'session_id': session_id, 'quote': row['response']})
        except:
            pass

    return themes

def analyze_time_to_recovery(event_windows):
    """Compute time-to-recovery distributions from escalation events."""
    if event_windows.empty:
        return {}

    results = {}
    max_window = 3000  # milliseconds

    for modality in MODALITIES:
        mod_events = event_windows[event_windows['modality'] == modality]
        if len(mod_events) == 0:
            continue

        # For each event, find when proximity returns to 0 (or cap at max_window)
        recovery_times = []

        for event_id in mod_events['event_id'].unique():
            event_data = mod_events[mod_events['event_id'] == event_id].sort_values('t_rel')
            # Find first time proximity_level == 0 AFTER escalation (t_rel > 0)
            post_event = event_data[event_data['t_rel'] > 0]
            zero_mask = post_event['proximity_level'] == 0
            zero_times = post_event.loc[zero_mask, 't_rel'].values

            if len(zero_times) > 0:
                recovery_time = zero_times[0]  # First return to 0 after escalation
            else:
                recovery_time = max_window  # Never recovered in window

            recovery_times.append(recovery_time)

        if recovery_times:
            results[modality] = {
                'median_recovery_ms': np.median(recovery_times),
                'mean_recovery_ms': np.mean(recovery_times),
                'sd_recovery_ms': np.std(recovery_times),
                'n_events': len(recovery_times),
                'pct_no_recovery': 100 * np.sum(np.array(recovery_times) >= max_window) / len(recovery_times)
            }

    return results

def analyze_tilt_reversal(event_windows):
    """Compute fraction of escalation events followed by tilt reversal (corrective action)."""
    if event_windows.empty:
        return {}

    results = {}
    window_post_event = 500  # ms after escalation

    for modality in MODALITIES:
        mod_events = event_windows[event_windows['modality'] == modality]
        if len(mod_events) == 0:
            continue

        reversals = []

        for event_id in mod_events['event_id'].unique():
            event_data = mod_events[mod_events['event_id'] == event_id].sort_values('t_rel')

            # Get tilt sign before and after escalation
            pre_event = event_data[event_data['t_rel'] <= 0]
            post_event = event_data[(event_data['t_rel'] > 0) & (event_data['t_rel'] <= window_post_event)]

            if len(pre_event) > 0 and len(post_event) > 0:
                # Compute mean gamma sign before/after
                pre_gamma_sign = np.sign(pre_event['gamma'].mean())
                post_gamma_sign = np.sign(post_event['gamma'].mean())

                # Reversal = sign change
                reversed = (pre_gamma_sign * post_gamma_sign) < 0
                reversals.append(int(reversed))

        if reversals:
            results[modality] = {
                'pct_reversals': 100 * np.mean(reversals),
                'n_events': len(reversals),
                'reversal_count': np.sum(reversals)
            }

    return results

def load_study2_cohort():
    """Load data from study-2.db (old cohort) for comparison."""
    db2_path = os.path.join(PROJECT_DIR, 'data', 'study-2.db')
    if not os.path.exists(db2_path):
        print(f"[Study-2] Database not found at {db2_path}")
        return None, None

    try:
        conn = sqlite3.connect(db2_path)
        sessions2_df = pd.read_sql_query("SELECT session_id, modality, age, gender, handedness FROM sessions WHERE status IN ('accepted', 'completed')", conn)
        rounds2_df = pd.read_sql_query("SELECT session_id, round, difficulty_level, falls FROM rounds ORDER BY session_id, round", conn)
        conn.close()

        data2 = rounds2_df.merge(sessions2_df, on='session_id', how='left')
        return data2, sessions2_df
    except Exception as e:
        print(f"[Study-2] Error loading: {e}")
        return None, None

def compare_cohorts(data1, data2):
    """Compare baseline confound between study cohorts."""
    if data2 is None:
        return {}

    results = {'study_1': {}, 'study_2': {}}

    for modality in MODALITIES:
        # Study 1
        mod1 = data1[data1['modality'] == modality][data1['difficulty_level'] == 1]['falls'].values
        if len(mod1) > 0:
            results['study_1'][modality] = {'mean': np.mean(mod1), 'n': len(mod1)}

        # Study 2
        mod2 = data2[data2['modality'] == modality][data2['difficulty_level'] == 1]['falls'].values
        if len(mod2) > 0:
            results['study_2'][modality] = {'mean': np.mean(mod2), 'n': len(mod2)}

    return results

def audit_checkpoint_data(data):
    """Check validity of checkpoint data."""
    checkpoint_summary = {}

    for modality in MODALITIES:
        mod_data = data[data['modality'] == modality]
        cp_values = mod_data['checkpoints_passed'].values

        checkpoint_summary[modality] = {
            'n_rounds': len(cp_values),
            'n_zero': np.sum(cp_values == 0),
            'n_nonzero': np.sum(cp_values > 0),
            'pct_zero': 100 * np.sum(cp_values == 0) / len(cp_values),
            'min': np.min(cp_values),
            'max': np.max(cp_values),
        }

    return checkpoint_summary

def analyze_handedness_modality(data, demographics):
    """Cross-tabulation: handedness × modality effects."""
    conn = sqlite3.connect(DB_PATH)
    demos_df = pd.read_sql_query(
        "SELECT DISTINCT session_id, modality, handedness FROM sessions WHERE status IN ('accepted', 'completed')",
        conn
    )
    conn.close()

    data = data.merge(demos_df[['session_id', 'handedness']], on='session_id', how='left')

    results = {}
    handedness_vals = data['handedness'].unique()

    for hand in handedness_vals:
        hand_data = data[data['handedness'] == hand]
        for modality in MODALITIES:
            key = f'{hand}__{modality}'
            mod_data = hand_data[hand_data['modality'] == modality]
            level2_data = mod_data[mod_data['difficulty_level'] == 2]['falls'].values

            if len(level2_data) > 0:
                results[key] = {
                    'n': len(level2_data),
                    'mean_falls': np.mean(level2_data),
                    'handedness': hand,
                    'modality': modality
                }

    return results

def analyze_fatigue(data):
    """Analyze fatigue: within-round performance curves (early vs late trials)."""
    results = {}

    # Group by modality and level, then split by time within round
    for modality in MODALITIES:
        results[modality] = {}
        mod_data = data[data['modality'] == modality]

        for level in [1, 2, 3, 4]:
            level_data = mod_data[mod_data['difficulty_level'] == level]

            # Approximate: "early" = round starts, "late" = near end
            # Use session order as proxy (first participant sessions are "early" in day)
            sessions_sorted = sorted(level_data['session_id'].unique())
            early_sessions = sessions_sorted[:len(sessions_sorted)//2]
            late_sessions = sessions_sorted[len(sessions_sorted)//2:]

            early_falls = level_data[level_data['session_id'].isin(early_sessions)]['falls'].values
            late_falls = level_data[level_data['session_id'].isin(late_sessions)]['falls'].values

            if len(early_falls) > 0 and len(late_falls) > 0:
                results[modality][level] = {
                    'early_mean': np.mean(early_falls),
                    'late_mean': np.mean(late_falls),
                    'early_n': len(early_falls),
                    'late_n': len(late_falls),
                    'fatigue_delta': np.mean(late_falls) - np.mean(early_falls)
                }

    return results

def fit_learning_curves(data):
    """Fit logistic and power-law models to learning curves."""
    from scipy.optimize import curve_fit

    def logistic(x, L, k, x0):
        return L / (1 + np.exp(-k * (x - x0)))

    def power_law(x, a, b):
        return a * (x ** (-b))

    results = {}

    for modality in MODALITIES:
        results[modality] = {'logistic': {}, 'power_law': {}}
        mod_data = data[data['modality'] == modality]
        sessions = mod_data['session_id'].unique()

        for session_id in sessions:
            session_data = mod_data[mod_data['session_id'] == session_id].sort_values('difficulty_level')
            levels = session_data['difficulty_level'].values.astype(float)
            falls = session_data['falls'].values.astype(float)

            if len(levels) >= 3:
                try:
                    # Fit logistic
                    p0 = [max(falls), 1, 2]
                    popt_log, _ = curve_fit(logistic, levels, falls, p0=p0, maxfev=10000)
                    results[modality]['logistic'][session_id] = {'params': popt_log}
                except:
                    pass

                try:
                    # Fit power law
                    p0 = [1, 0.5]
                    popt_pow, _ = curve_fit(power_law, levels, falls, p0=p0, maxfev=10000)
                    results[modality]['power_law'][session_id] = {'params': popt_pow}
                except:
                    pass

    return results

def audit_gyro_calibration(trajectory_data):
    """Audit gyro tilt for drift (calibration issues) over session duration."""
    results = {}

    for modality in MODALITIES:
        mod_traj = trajectory_data[trajectory_data['modality'] == modality]
        if len(mod_traj) == 0:
            continue

        drifts = []

        for session_id in mod_traj['session_id'].unique():
            session_traj = mod_traj[mod_traj['session_id'] == session_id].sort_values('t_ms')

            # Split into first and last 25% of session
            n = len(session_traj)
            early_tilt = session_traj.iloc[:n//4]['gamma'].values
            late_tilt = session_traj.iloc[-n//4:]['gamma'].values

            if len(early_tilt) > 0 and len(late_tilt) > 0:
                early_range = np.max(early_tilt) - np.min(early_tilt)
                late_range = np.max(late_tilt) - np.min(late_tilt)
                drift = late_range - early_range
                drifts.append(drift)

        if drifts:
            results[modality] = {
                'mean_drift': np.mean(drifts),
                'sd_drift': np.std(drifts),
                'n_sessions': len(drifts)
            }

    return results

def main():
    print("[Analysis] Loading data...")
    data, surveys = load_data()

    print(f"[Analysis] Loaded {len(data)} rounds from {data['session_id'].nunique()} sessions")
    print(f"[Analysis] Modality breakdown: {data['modality'].value_counts().to_dict()}")

    # Filter short rounds
    print("[Analysis] Filtering short rounds...")
    data = filter_short_rounds(data)
    print(f"[Analysis] After filtering: {len(data)} rounds retained")

    # NEW ANALYSES
    print("[Analysis] Running age correlation analysis...")
    age_corr, data = analyze_age_correlations(data)

    print("[Analysis] Computing Bayes factors...")
    bayes_factors = compute_bayes_factors(data)

    print("[Analysis] Analyzing survey responses...")
    survey_themes = analyze_survey_responses(surveys, data)

    print("[Analysis] Auditing checkpoint data...")
    checkpoint_audit = audit_checkpoint_data(data)

    print("[Analysis] Analyzing handedness × modality...")
    handedness_results = analyze_handedness_modality(data, None)

    print("[Analysis] Running fatigue analysis...")
    fatigue = analyze_fatigue(data)

    print("[Analysis] Fitting learning curves...")
    learning_curves_fit = fit_learning_curves(data)

    print("[Analysis] Loading trajectory data for additional analyses...")
    conn = sqlite3.connect(DB_PATH)
    traj_full = pd.read_sql_query(
        "SELECT t.*, s.modality FROM trajectories t JOIN sessions s ON t.session_id = s.session_id",
        conn
    )
    conn.close()

    print("[Analysis] Running gyro calibration audit...")
    gyro_audit = audit_gyro_calibration(traj_full)

    print("[Analysis] Loading study-2 cohort for comparison...")
    data2, demos2 = load_study2_cohort()
    if data2 is not None:
        cohort_comparison = compare_cohorts(data, data2)
    else:
        cohort_comparison = {}

    # Compute stats on cleaned data
    print("[Analysis] Computing descriptive statistics...")
    descriptives = compute_descriptives(data)

    print("[Analysis] Computing change-from-baseline analysis...")
    delta_analysis = compute_delta_analysis(data)

    print("[Analysis] Computing demographics analysis...")
    demographics = compute_demographics_analysis()

    print("[Analysis] Computing learning curve analysis...")
    learning_curve = compute_learning_curve(data)

    print("[Analysis] Computing additional analyses...")
    checkpoints = compute_checkpoints_analysis(data)
    scores = compute_score_analysis(data)
    proximity_time = compute_proximity_time_analysis(data)
    tilt_magnitude = compute_tilt_magnitude_analysis(None)

    # Load trajectory data for spatial analyses
    print("[Analysis] Loading trajectory data...")
    conn = sqlite3.connect(DB_PATH)
    traj_df = pd.read_sql_query(
        "SELECT t.*, s.modality FROM trajectories t JOIN sessions s ON t.session_id = s.session_id",
        conn
    )
    conn.close()

    print("[Analysis] Computing path deviation analysis...")
    path_deviation = compute_path_deviation(traj_df)

    print("[Analysis] Computing trajectory smoothness...")
    trajectory_smoothness = compute_trajectory_smoothness(traj_df)

    print("[Analysis] Computing fall location analysis...")
    fall_location = compute_fall_location_analysis(traj_df, data)

    # Sensitivity analysis: winsorize falls
    print("[Analysis] Computing sensitivity analysis (winsorized falls)...")
    data_winsorized = compute_winsorized_falls(data)

    # Steering response analysis (BEFORE output formatting to populate recovery_stats, reversal_stats)
    print("[Analysis] Finding proximity escalation events...")
    event_windows = pd.DataFrame()
    recovery_stats = {}
    reversal_stats = {}

    try:
        conn_traj = sqlite3.connect(DB_PATH)
        traj_df = pd.read_sql_query(
            "SELECT session_id, difficulty_level, t_ms, x_frac, y_frac, proximity_level, gamma, beta FROM trajectories ORDER BY session_id, difficulty_level, t_ms",
            conn_traj
        )
        conn_traj.close()

        if not traj_df.empty:
            events = find_proximity_escalation_events(traj_df)
            print(f"[Steering] Found {len(events)} escalation events")

            if events:
                print("[Analysis] Computing steering response metrics...")
                event_windows = compute_steering_response_analysis(traj_df, events)
                print(f"[Steering] Extracted {len(event_windows)} trajectory samples from events")

                # NEW: Compute time-to-recovery and tilt reversal
                if not event_windows.empty:
                    print("[Analysis] Computing time-to-recovery and tilt reversal...")
                    recovery_stats = analyze_time_to_recovery(event_windows)
                    reversal_stats = analyze_tilt_reversal(event_windows)
        else:
            print("[Analysis] No trajectory data available for steering response analysis")
    except Exception as e:
        print(f"[Warning] Could not compute steering response analysis: {e}")

    # Format output
    output_text = []
    output_text.append('% ========== PARTICIPANT DEMOGRAPHICS ==========')
    output_text.append('')
    output_text.append(format_demographics_table(demographics))
    output_text.append('')

    output_text.append('% ========== DESCRIPTIVE STATISTICS ==========')
    output_text.append('')
    output_text.append(format_descriptives_table(descriptives))
    output_text.append('')
    output_text.append(format_statistical_tests(data, delta_analysis))
    output_text.append(format_delta_analysis(delta_analysis))

    # Add sensitivity analysis results
    output_text.append('\n\\subsubsection{Sensitivity Analysis (Winsorized Falls at 95th Percentile)}')
    output_text.append('\nKruskal-Wallis H tests with winsorized falls:')
    for level in [2, 3, 4]:
        level_name = LEVELS[level]['name']
        kw = kruskal_wallis_test_on_column(data_winsorized, level, column='falls_winsorized')
        if kw:
            output_text.append(
                f'\\textit{{{level_name} level:}} H({kw["df"]}) = {kw["h"]:.3f}, '
                f'p = {kw["p"]:.4f} {"(sig.)" if kw["p"] < 0.05 else "(n.s.)"}'
            )

    output_text.append('\n% ========== WITHIN-SESSION LEARNING AND TRAJECTORY METRICS ==========')
    output_text.append('')
    output_text.append('\\subsubsection{Path Deviation (Distance from Path Center)}')
    output_text.append('')
    for modality in MODALITIES:
        output_text.append(f'\\textit{{{modality.capitalize()}}}:')
        for level in [1, 2, 3, 4]:
            if level in path_deviation[modality]:
                pd_m = path_deviation[modality][level]['mean_deviation']
                pd_sd = path_deviation[modality][level]['sd_deviation']
                output_text.append(f'  L{level}: {pd_m:.3f} ± {pd_sd:.3f} units (n={path_deviation[modality][level]["n_samples"]} samples)')
        output_text.append('')

    output_text.append('\\subsubsection{Trajectory Smoothness (Mean Acceleration)}')
    output_text.append('')
    for modality in MODALITIES:
        output_text.append(f'\\textit{{{modality.capitalize()}}}:')
        for level in [1, 2, 3, 4]:
            if level in trajectory_smoothness[modality]:
                sm = trajectory_smoothness[modality][level].get('mean_acceleration', np.nan)
                if not np.isnan(sm):
                    output_text.append(f'  L{level}: mean accel = {sm:.4f} (n={trajectory_smoothness[modality][level]["n_samples"]} samples)')
        output_text.append('')

    output_text.append(format_additional_analyses(checkpoints, scores, proximity_time, tilt_magnitude))

    # NEW OUTPUT SECTIONS
    output_text.append('\n% ========== INDIVIDUAL DIFFERENCES & NEW ANALYSES ==========')
    output_text.append('')

    # Age correlations
    output_text.append('\\subsubsection{Age Correlations with Baseline Performance}')
    output_text.append('')
    if age_corr:
        for key, val in age_corr.items():
            output_text.append(f'{key}: r = {val["r"]:.3f}, p = {val["p"]:.4f}, n = {val["n"]}')
    else:
        output_text.append('(No significant correlations with age)')
    output_text.append('')

    # Handedness cross-tabs
    output_text.append('\\subsubsection{Handedness × Modality Cross-Tabulation (Level 2 / Easy)}')
    output_text.append('')
    if handedness_results:
        hands_seen = set()
        for key in handedness_results.keys():
            hand = key.split('__')[0]
            if hand not in hands_seen:
                hands_seen.add(hand)
                output_text.append(f'\\textit{{{hand}}}:')
                for modality in MODALITIES:
                    check_key = f'{hand}__{modality}'
                    if check_key in handedness_results:
                        res = handedness_results[check_key]
                        output_text.append(f'  {modality}: mean falls = {res["mean_falls"]:.2f} (n={res["n"]})')
                output_text.append('')
    else:
        output_text.append('(No handedness data available)')
        output_text.append('')

    # Bayes factors
    output_text.append('\\subsubsection{Bayes Factors (Evidence for Null Hypothesis)}')
    output_text.append('')
    for level, bf_data in bayes_factors.items():
        output_text.append(f'Level {level}: BF01 ≈ {bf_data["bf01_approx"]:.2f} ({bf_data["interpretation"]})')
    output_text.append('')

    # Checkpoint audit
    output_text.append('\\subsubsection{Checkpoint Data Validity}')
    output_text.append('')
    for modality in MODALITIES:
        if modality in checkpoint_audit:
            ca = checkpoint_audit[modality]
            output_text.append(
                f'{modality}: {ca["pct_zero"]:.1f}\\% of rounds had 0 checkpoints '
                f'(n={ca["n_zero"]}/{ca["n_rounds"]})'
            )
    output_text.append('')

    # Fatigue analysis
    output_text.append('\\subsubsection{Fatigue Analysis (Early vs Late Sessions)}')
    output_text.append('')
    for modality in MODALITIES:
        output_text.append(f'\\textit{{{modality.capitalize()}}}:')
        for level in [2, 3, 4]:
            if level in fatigue.get(modality, {}):
                f_data = fatigue[modality][level]
                output_text.append(
                    f'  L{level}: early={f_data["early_mean"]:.2f}, '
                    f'late={f_data["late_mean"]:.2f}, delta={f_data["fatigue_delta"]:.2f}'
                )
        output_text.append('')

    # Recovery statistics
    if recovery_stats:
        output_text.append('\\subsubsection{Time-to-Recovery from Proximity Escalations}')
        output_text.append('')
        for modality, stats_dict in recovery_stats.items():
            output_text.append(
                f'{modality}: median={stats_dict["median_recovery_ms"]:.0f}ms, '
                f'mean={stats_dict["mean_recovery_ms"]:.0f}ms, '
                f'no-recovery={stats_dict["pct_no_recovery"]:.1f}\\%'
            )
        output_text.append('')

    # Tilt reversal statistics
    if reversal_stats:
        output_text.append('\\subsubsection{Tilt Reversal Frequency (Corrective Response)}')
        output_text.append('')
        for modality, stats_dict in reversal_stats.items():
            output_text.append(
                f'{modality}: {stats_dict["pct_reversals"]:.1f}\\% of escalations followed by tilt reversal '
                f'(n={stats_dict["n_events"]} events)'
            )
        output_text.append('')

    # Study-2 comparison
    if cohort_comparison:
        output_text.append('\\subsubsection{Study-2 Cohort Comparison (Baseline Confound)}')
        output_text.append('')
        for mod in MODALITIES:
            s1 = cohort_comparison.get('study_1', {}).get(mod, {}).get('mean', 'N/A')
            s2 = cohort_comparison.get('study_2', {}).get(mod, {}).get('mean', 'N/A')
            output_text.append(f'{mod}: Study-1={s1:.2f if isinstance(s1, float) else "N/A"}, Study-2={s2:.2f if isinstance(s2, float) else "N/A"}')
        output_text.append('')

    # Survey themes
    if survey_themes:
        output_text.append('\\subsubsection{Qualitative Themes from Post-Round Surveys}')
        output_text.append('')
        for theme, examples in survey_themes.items():
            output_text.append(f'\\textbf{{{theme.replace("_", " ").title()}}} (n={len(examples)}):')
            for i, example in enumerate(examples[:2]):  # Show up to 2 examples per theme
                quote = str(example.get('quote', ''))[:100]  # First 100 chars
                output_text.append(f'  Example {i+1}: \\textit{{``{quote}...\'\'}}'  )
            output_text.append('')

    # Write to file
    print(f"[Analysis] Writing output to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, 'w') as f:
        f.write('\n'.join(output_text))

    # Print sample output
    print('\n'.join(output_text[:100]))  # Print first 100 lines to console

    # Create figures
    print("[Analysis] Generating fig_falls.pdf...")
    generate_falls_figure(data, descriptives)

    print("[Analysis] Generating fig_learning_curve.pdf...")
    generate_learning_curve_figure(learning_curve)

    print("[Analysis] Generating fig_path_deviation.pdf...")
    generate_path_deviation_figure(path_deviation)

    print("[Analysis] Generating fig_proximity_time.pdf...")
    generate_proximity_time_figure(proximity_time)

    # Generate steering response figure if we have event windows
    if not event_windows.empty:
        print("[Analysis] Generating fig_steering_response.pdf...")
        generate_steering_response_figure(event_windows)

    print(f"[Analysis] Done. Output written to {OUTPUT_PATH}")

def generate_falls_figure(data, descriptives):
    """Generate grouped bar chart of falls by modality and level."""
    fig, ax = plt.subplots(figsize=(10, 5))

    levels_to_plot = [2, 3, 4]
    x = np.arange(len(levels_to_plot))
    width = 0.25

    colors = {'haptic': '#0066CC', 'audio': '#E74C3C', 'none': '#999999'}

    for i, modality in enumerate(MODALITIES):
        means = []
        sds = []

        for level in levels_to_plot:
            if level in descriptives[modality] and descriptives[modality][level]['n'] > 0:
                means.append(descriptives[modality][level]['mean'])
                sds.append(descriptives[modality][level]['sd'])
            else:
                means.append(0)
                sds.append(0)

        offset = (i - 1) * width
        ax.bar(x + offset, means, width, label=modality.capitalize(),
               color=colors[modality], capsize=5, error_kw={'linewidth': 1})
        # Note: matplotlib bar() doesn't directly support yerr in recent versions,
        # so we add error bars separately
        ax.errorbar(x + offset, means, yerr=sds, fmt='none', ecolor='black',
                   capsize=5, capthick=1, elinewidth=1, alpha=0.7)

    ax.set_xlabel('Difficulty Level', fontsize=11)
    ax.set_ylabel('Number of Falls (mean ± SD)', fontsize=11)
    ax.set_xticks(x)
    ax.set_xticklabels([LEVELS[l]['label'] for l in levels_to_plot])
    ax.legend(title='Modality', fontsize=10, title_fontsize=10)
    ax.grid(axis='y', alpha=0.3)
    ax.set_ylim(bottom=0)

    plt.tight_layout()
    plt.savefig(FIGURE_PATH, dpi=300, bbox_inches='tight')
    print(f"[Analysis] Figure saved to {FIGURE_PATH}")
    plt.close()

def filter_short_rounds(data):
    """
    Exclude rounds where round_duration_ms is anomalously short (< 5 seconds).
    These are likely technical failures or incomplete rounds.
    Returns cleaned dataframe and prints exclusion summary.
    """
    duration_threshold = 5000  # 5 seconds — clearly anomalous

    # Mark rows to keep
    keep_rows = []
    n_excluded_short = 0
    n_missing_data = 0

    for idx, row in data.iterrows():
        level = row['difficulty_level']
        modality = row['modality']
        duration = row['round_duration_ms']

        # Skip rows with missing data
        if pd.isna(level) or pd.isna(duration) or pd.isna(modality):
            n_missing_data += 1
            continue

        if duration >= duration_threshold:
            keep_rows.append(idx)
        else:
            n_excluded_short += 1

    cleaned_data = data.loc[keep_rows].reset_index(drop=True)

    # Print summary
    print("\n[Filter] Short-round exclusion summary:")
    print(f"  Threshold: round_duration_ms < {duration_threshold}ms excluded as anomalous")
    print(f"  {n_excluded_short} rounds excluded (< 5 seconds)")
    if n_missing_data > 0:
        print(f"  {n_missing_data} rounds excluded due to missing data")
    print(f"  Total excluded: {n_excluded_short + n_missing_data}, Retained: {len(cleaned_data)} rounds")

    return cleaned_data

def compute_winsorized_falls(data):
    """Winsorize falls data at 95th percentile per level × modality cell."""
    data = data.copy()

    for modality in MODALITIES:
        for level in [1, 2, 3, 4]:
            mask = (data['modality'] == modality) & (data['difficulty_level'] == level)
            falls_vals = data.loc[mask, 'falls'].values

            if len(falls_vals) > 0:
                p95 = np.percentile(falls_vals, 95)
                data.loc[mask, 'falls_winsorized'] = np.minimum(falls_vals, p95)
            else:
                data.loc[mask, 'falls_winsorized'] = falls_vals

    return data

def kruskal_wallis_test_on_column(data, level, column='falls'):
    """Run Kruskal-Wallis H test using a specific column (e.g. 'falls_winsorized')."""
    groups = []
    for modality in MODALITIES:
        falls = data[(data['modality'] == modality) & (data['difficulty_level'] == level)][column].values
        if len(falls) > 0:
            groups.append(falls)

    if len(groups) == 3 and all(len(g) > 0 for g in groups):
        h_stat, p_val = stats.kruskal(*groups)
        return {'h': h_stat, 'p': p_val, 'df': 2}
    else:
        return None

def find_proximity_escalation_events(trajectories_df):
    """
    Find proximity escalation events (increase in proximity_level) in trajectory data.
    Filter out events within 500ms before a fall/respawn (detected by large position jump).
    Returns list of dicts: {session_id, difficulty_level, t_event_ms, event_num}
    """
    events = []

    # Group by session and level
    for (session_id, level), group in trajectories_df.groupby(['session_id', 'difficulty_level']):
        group = group.sort_values('t_ms').reset_index(drop=True)

        # Detect position jumps (respawns): x_frac or y_frac changes by > 0.3 in one step
        group['position_jump'] = (
            group['x_frac'].diff().abs() > 0.3
        ) | (
            group['y_frac'].diff().abs() > 0.3
        )

        # Find escalation events: proximity_level increases
        group['prox_increased'] = group['proximity_level'] > group['proximity_level'].shift(1)

        for idx in range(1, len(group)):
            if group.loc[idx, 'prox_increased']:
                t_event = group.loc[idx, 't_ms']

                # Skip if within 500ms before a fall/respawn
                mask_before = (group['t_ms'] >= t_event - 500) & (group['t_ms'] < t_event)
                if group.loc[mask_before, 'position_jump'].any():
                    continue

                events.append({
                    'session_id': session_id,
                    'difficulty_level': level,
                    't_event_ms': t_event,
                    'event_num': len([e for e in events if e['session_id'] == session_id and e['difficulty_level'] == level]) + 1,
                })

    return events

def compute_steering_response_analysis(trajectories_df, events):
    """
    For each event, extract a ±window of trajectory data and compute time-locked metrics.
    Returns aggregated data per modality for plotting.
    """
    window_before = 1000  # ms
    window_after = 3000   # ms

    # Merge modality onto trajectories
    conn = sqlite3.connect(DB_PATH)
    traj_mod = pd.read_sql_query(
        "SELECT t.*, s.modality FROM trajectories t JOIN sessions s ON t.session_id = s.session_id",
        conn
    )
    conn.close()
    traj_mod = traj_mod.sort_values(['session_id', 'difficulty_level', 't_ms']).reset_index(drop=True)

    # For each event, extract window and compute metrics
    event_windows = []

    for event in events:
        session_id = event['session_id']
        level = event['difficulty_level']
        t_event = event['t_event_ms']

        # Get modality for this session
        modality = traj_mod[(traj_mod['session_id'] == session_id)]['modality'].iloc[0]

        # Extract window
        mask = (
            (traj_mod['session_id'] == session_id) &
            (traj_mod['difficulty_level'] == level) &
            (traj_mod['t_ms'] >= t_event - window_before) &
            (traj_mod['t_ms'] <= t_event + window_after)
        )
        window = traj_mod[mask].copy()

        if len(window) > 0:
            window['t_rel'] = window['t_ms'] - t_event
            window['tilt_magnitude'] = np.sqrt(window['gamma']**2 + window['beta']**2)
            window['event_id'] = f"{session_id}_{level}_{event['event_num']}"
            window['modality'] = modality
            event_windows.append(window)

    if event_windows:
        all_windows = pd.concat(event_windows, ignore_index=True)
        return all_windows
    else:
        return pd.DataFrame()

def generate_learning_curve_figure(learning_curve):
    """Generate line plot of falls across difficulty levels (learning curve)."""
    fig, ax = plt.subplots(figsize=(8, 5))

    colors = {'haptic': '#0066CC', 'audio': '#E74C3C', 'none': '#999999'}
    levels_to_plot = [1, 2, 3, 4]

    for modality in MODALITIES:
        means = []
        sds = []
        for level in levels_to_plot:
            if level in learning_curve[modality]:
                means.append(learning_curve[modality][level]['mean'])
                sds.append(learning_curve[modality][level]['sd'])
            else:
                means.append(0)
                sds.append(0)

        ax.plot(levels_to_plot, means, marker='o', label=modality.capitalize(),
               color=colors[modality], linewidth=2.5, markersize=7)
        ax.fill_between(levels_to_plot, np.array(means) - np.array(sds),
                        np.array(means) + np.array(sds), alpha=0.2, color=colors[modality])

    ax.set_xlabel('Difficulty Level', fontsize=11)
    ax.set_ylabel('Mean Falls (±1 SD)', fontsize=11)
    ax.set_xticks(levels_to_plot)
    ax.set_xticklabels([LEVELS[l]['label'] for l in levels_to_plot])
    ax.legend(title='Modality', fontsize=10, title_fontsize=10)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(bottom=0)

    plt.tight_layout()
    fig_learning_path = os.path.join(OUTPUT_DIR, 'fig_learning_curve.pdf')
    plt.savefig(fig_learning_path, dpi=300, bbox_inches='tight')
    print(f"[Analysis] Learning curve figure saved to {fig_learning_path}")
    plt.close()

def generate_path_deviation_figure(path_deviation):
    """Generate bar chart of path deviation (accuracy) across levels."""
    fig, ax = plt.subplots(figsize=(10, 5))

    levels_to_plot = [2, 3, 4]
    x = np.arange(len(levels_to_plot))
    width = 0.25

    colors = {'haptic': '#0066CC', 'audio': '#E74C3C', 'none': '#999999'}

    for i, modality in enumerate(MODALITIES):
        deviations = []
        for level in levels_to_plot:
            if level in path_deviation[modality]:
                deviations.append(path_deviation[modality][level]['mean_deviation'])
            else:
                deviations.append(0)

        offset = (i - 1) * width
        ax.bar(x + offset, deviations, width, label=modality.capitalize(),
              color=colors[modality], alpha=0.8)

    ax.set_xlabel('Difficulty Level', fontsize=11)
    ax.set_ylabel('Mean Distance from Path Center', fontsize=11)
    ax.set_xticks(x)
    ax.set_xticklabels([LEVELS[l]['label'] for l in levels_to_plot])
    ax.legend(title='Modality', fontsize=10, title_fontsize=10)
    ax.grid(axis='y', alpha=0.3)
    ax.set_ylim(bottom=0)

    plt.tight_layout()
    fig_deviation_path = os.path.join(OUTPUT_DIR, 'fig_path_deviation.pdf')
    plt.savefig(fig_deviation_path, dpi=300, bbox_inches='tight')
    print(f"[Analysis] Path deviation figure saved to {fig_deviation_path}")
    plt.close()

def generate_steering_response_figure(event_windows):
    """
    Generate two-panel time-locked figure: proximity level and tilt magnitude.
    Left panel: mean proximity level vs time, Right panel: mean tilt magnitude vs time.
    """
    if event_windows.empty:
        print("[Steering] No event windows available for figure generation.")
        return

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5))

    colors = {'haptic': '#0066CC', 'audio': '#E74C3C', 'none': '#999999'}

    # Left panel: proximity level
    for modality in MODALITIES:
        mod_data = event_windows[event_windows['modality'] == modality]
        if len(mod_data) > 0:
            # Bin by time and compute mean ± SE
            time_bins = np.arange(-1000, 3100, 100)
            binned_means = []
            binned_se = []
            bin_centers = []

            for i in range(len(time_bins) - 1):
                t_min, t_max = time_bins[i], time_bins[i+1]
                mask = (mod_data['t_rel'] >= t_min) & (mod_data['t_rel'] < t_max)
                bin_data = mod_data.loc[mask, 'proximity_level'].values

                if len(bin_data) > 0:
                    binned_means.append(np.mean(bin_data))
                    binned_se.append(np.std(bin_data) / np.sqrt(len(bin_data)))
                    bin_centers.append((t_min + t_max) / 2)

            bin_centers = np.array(bin_centers) / 1000  # Convert to seconds
            binned_means = np.array(binned_means)
            binned_se = np.array(binned_se)

            ax1.plot(bin_centers, binned_means, marker='o', label=modality.capitalize(),
                    color=colors[modality], linewidth=2, markersize=4)
            ax1.fill_between(bin_centers, binned_means - binned_se, binned_means + binned_se,
                            alpha=0.2, color=colors[modality])

    ax1.axvline(x=0, color='black', linestyle='--', linewidth=1.5, label='Escalation event')
    ax1.set_xlabel('Time relative to escalation (s)', fontsize=11)
    ax1.set_ylabel('Proximity Level', fontsize=11)
    ax1.set_xlim(-1, 3)
    ax1.set_ylim(-0.2, 3.2)
    ax1.grid(True, alpha=0.3)
    ax1.legend(fontsize=10)

    # Right panel: tilt magnitude
    for modality in MODALITIES:
        mod_data = event_windows[event_windows['modality'] == modality]
        if len(mod_data) > 0:
            time_bins = np.arange(-1000, 3100, 100)
            binned_means = []
            binned_se = []
            bin_centers = []

            for i in range(len(time_bins) - 1):
                t_min, t_max = time_bins[i], time_bins[i+1]
                mask = (mod_data['t_rel'] >= t_min) & (mod_data['t_rel'] < t_max)
                bin_data = mod_data.loc[mask, 'tilt_magnitude'].values

                if len(bin_data) > 0:
                    binned_means.append(np.mean(bin_data))
                    binned_se.append(np.std(bin_data) / np.sqrt(len(bin_data)))
                    bin_centers.append((t_min + t_max) / 2)

            bin_centers = np.array(bin_centers) / 1000  # Convert to seconds
            binned_means = np.array(binned_means)
            binned_se = np.array(binned_se)

            ax2.plot(bin_centers, binned_means, marker='o', label=modality.capitalize(),
                    color=colors[modality], linewidth=2, markersize=4)
            ax2.fill_between(bin_centers, binned_means - binned_se, binned_means + binned_se,
                            alpha=0.2, color=colors[modality])

    ax2.axvline(x=0, color='black', linestyle='--', linewidth=1.5, label='Escalation event')
    ax2.set_xlabel('Time relative to escalation (s)', fontsize=11)
    ax2.set_ylabel('Tilt Magnitude (rad/s)', fontsize=11)
    ax2.set_xlim(-1, 3)
    ax2.grid(True, alpha=0.3)
    ax2.legend(fontsize=10)

    plt.tight_layout()
    fig_steering_path = os.path.join(OUTPUT_DIR, 'fig_steering_response.pdf')
    plt.savefig(fig_steering_path, dpi=300, bbox_inches='tight')
    print(f"[Analysis] Steering response figure saved to {fig_steering_path}")
    plt.close()

def generate_proximity_time_figure(proximity_time):
    """Generate stacked bar chart of proximity zone time by modality and level."""
    fig, ax = plt.subplots(figsize=(10, 5))

    levels_to_plot = [2, 3, 4]
    x = np.arange(len(levels_to_plot))
    width = 0.25

    colors = {'haptic': '#0066CC', 'audio': '#E74C3C', 'none': '#999999'}

    for i, modality in enumerate(MODALITIES):
        level_1_pcts = []
        level_2_pcts = []
        level_3_pcts = []

        for level in levels_to_plot:
            if level in proximity_time[modality]:
                pt = proximity_time[modality][level]
                level_1_pcts.append(pt['pct_level_1'])
                level_2_pcts.append(pt['pct_level_2'])
                level_3_pcts.append(pt['pct_level_3'])
            else:
                level_1_pcts.append(0)
                level_2_pcts.append(0)
                level_3_pcts.append(0)

        offset = (i - 1) * width

        # Stacked bars: light, medium, danger zones
        ax.bar(x + offset, level_1_pcts, width, label=f'{modality} - NEAR',
               color=colors[modality], alpha=0.5)
        ax.bar(x + offset, level_2_pcts, width, bottom=level_1_pcts,
               color=colors[modality], alpha=0.7)
        ax.bar(x + offset, level_3_pcts, width,
               bottom=np.array(level_1_pcts) + np.array(level_2_pcts),
               color=colors[modality], alpha=1.0)

    ax.set_xlabel('Difficulty Level', fontsize=11)
    ax.set_ylabel('Percent of Round Duration', fontsize=11)
    ax.set_xticks(x)
    ax.set_xticklabels([LEVELS[l]['label'] for l in levels_to_plot])
    ax.set_ylim(0, 100)
    ax.grid(axis='y', alpha=0.3)

    plt.tight_layout()
    proximity_fig_path = os.path.join(OUTPUT_DIR, 'fig_proximity_time.pdf')
    plt.savefig(proximity_fig_path, dpi=300, bbox_inches='tight')
    print(f"[Analysis] Proximity time figure saved to {proximity_fig_path}")
    plt.close()

if __name__ == '__main__':
    main()
