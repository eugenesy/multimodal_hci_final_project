import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from scipy import stats
import glob
import os

def analyze_fitts_data(head_csv, mouse_csv):
    """Analyze and plot Fitts's Law data for both Head and Mouse control."""
    plt.figure(figsize=(10, 6))
    
    for csv_file, label, color in [(head_csv, "Head Control", "blue"), (mouse_csv, "Mouse Control", "red")]:
        if not csv_file or not os.path.exists(csv_file):
            print(f"Skipping {label}: File not found.")
            continue
            
        df = pd.read_csv(csv_file)
        
        # Use clean, consistent headers from Processing sketch / slides
        # ID = log2(2*D/W)
        x = np.log2(2 * df['targetDistance'] / df['targetWidth'])
        y = df['reactionTime_ms'].values
        
        # Linear Regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        line = slope * x + intercept
        
        # Plot Scatter
        plt.scatter(x, y, color=color, alpha=0.6, label=f"{label} Data")
        
        # Plot Regression Line
        equation = f"T = {intercept:.3f} + {slope:.3f} * ID (R² = {r_value**2:.3f})"
        plt.plot(x, line, color=color, linestyle='--', label=f"{label} Fit: {equation}")
        
        print(f"--- {label} Results ---")
        print(f"Regression Equation: {equation}")
        print(f"Throughput (1/b): {1/slope:.3f} bits/s")
        print("-" * 20)

    plt.xlabel("Index of Difficulty (log2(2*D/W))")
    plt.ylabel("reactionTime_ms")
    plt.title("Fitts's Law Study")
    plt.legend()
    plt.grid(True, linestyle=':', alpha=0.7)
    
    output_path = "fitts_results_plot.png"
    plt.savefig(output_path, dpi=300)
    plt.show()
    print(f"Chart saved to {os.getcwd()}/{output_path}")

def get_latest_file(pattern):
    files = glob.glob(pattern, recursive=True)
    return max(files, key=os.path.getmtime) if files else None

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("h_file", nargs="?", help="Path to head CSV")
    parser.add_argument("m_file", nargs="?", help="Path to mouse CSV")
    parser.add_argument("--user", help="User name to analyze latest results for")
    args = parser.parse_args()
    
    h_file, m_file = args.h_file, args.m_file
    
    if args.user:
        # Professional approach: Search in results/<user>/
        user_dir = os.path.join("results", args.user)
        h_file = get_latest_file(os.path.join(user_dir, "fitts_results_head_*.csv"))
        m_file = get_latest_file(os.path.join(user_dir, "fitts_results_mouse_*.csv"))
        
        if not h_file or not m_file:
            print(f"Could not find both files for user '{args.user}' in {user_dir}")
            # Fallback to current directory
            h_file = h_file or get_latest_file("fitts_results_head_*.csv")
            m_file = m_file or get_latest_file("fitts_results_mouse_*.csv")
    
    # Absolute last resort fallback: find any latest files in the folder tree
    if not h_file: h_file = get_latest_file("**/fitts_results_head_*.csv")
    if not m_file: m_file = get_latest_file("**/fitts_results_mouse_*.csv")
    
    if h_file and m_file:
        print(f"Analyzing:\n  - Head: {h_file}\n  - Mouse: {m_file}")
        analyze_fitts_data(h_file, m_file)
    else:
        print("Required CSV files not found.")
        print("Run the experiment first, or specify files: python analyze_results.py <head.csv> <mouse.csv>")
