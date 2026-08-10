import pygame
import random
import time
import math
import csv
import os
import pandas as pd

# Experiment Parameters
TRIALS_PER_CONDITION = 30
TARGET_WIDTHS = [20, 40, 60, 80]
TARGET_DISTANCES = [100, 200, 400, 600]

class FittsExperiment:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((1024, 768))
        self.width, self.height = self.screen.get_size()
        pygame.display.set_caption("Fitts's Law Experiment")
        
        self.font = pygame.font.SysFont("Arial", 24)
        self.clock = pygame.time.Clock()
        
        self.results = []
        self.current_trial = 0
        self.start_time = 0
        self.is_waiting_for_start = True
        
        # Current target info
        self.tx, self.ty = 0, 0
        self.tw = 0
        self.dist = 0
        self.prev_x, self.prev_y = self.width // 2, self.height // 2
        
        # Condition (Mouse vs Head)
        self.condition = "Head" # Default, can be changed
        
    def reset_target(self):
        self.tw = random.choice(TARGET_WIDTHS)
        self.dist = random.choice(TARGET_DISTANCES)
        
        # Pick a random angle
        angle = random.uniform(0, 2 * math.pi)
        
        # Calculate target center from previous position
        self.tx = int(self.prev_x + self.dist * math.cos(angle))
        self.ty = int(self.prev_y + self.dist * math.sin(angle))
        
        # Keep target within screen bounds
        padding = self.tw + 50
        self.tx = max(padding, min(self.width - padding, self.tx))
        self.ty = max(padding, min(self.height - padding, self.ty))
        
        # Recalculate actual distance
        self.dist = math.sqrt((self.tx - self.prev_x)**2 + (self.ty - self.prev_y)**2)
        
        self.start_time = time.time()
        self.is_waiting_for_start = False

    def draw(self):
        self.screen.fill((30, 30, 35)) # Dark background
        
        # UI Info
        status_text = self.font.render(f"Condition: {self.condition} | Trial: {self.current_trial}/{TRIALS_PER_CONDITION}", True, (200, 200, 200))
        self.screen.blit(status_text, (20, 20))
        
        if self.is_waiting_for_start:
            prompt = self.font.render("Click Center Red Dot to Start", True, (255, 255, 255))
            self.screen.blit(prompt, (self.width//2 - 100, self.height//2 - 50))
            pygame.draw.circle(self.screen, (255, 50, 50), (self.width//2, self.height//2), 15)
        else:
            # Draw Target
            pygame.draw.circle(self.screen, (0, 200, 100), (self.tx, self.ty), self.tw // 2)
            pygame.draw.circle(self.screen, (255, 255, 255), (self.tx, self.ty), 5) # Center dot
            
    def run(self, condition="Head"):
        self.condition = condition
        self.results = []
        self.current_trial = 0
        self.is_waiting_for_start = True
        
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE or event.key == pygame.K_q:
                        running = False
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    mx, my = pygame.mouse.get_pos()
                    
                    if self.is_waiting_for_start:
                        # Check if clicked center start dot
                        d = math.sqrt((mx - self.width//2)**2 + (my - self.height//2)**2)
                        if d < 20:
                            self.prev_x, self.prev_y = self.width//2, self.height//2
                            self.reset_target()
                    else:
                        # Check if target hit
                        d = math.sqrt((mx - self.tx)**2 + (my - self.ty)**2)
                        mt = time.time() - self.start_time
                        
                        # We log even if missed (just with a hit/miss flag)
                        is_hit = d <= (self.tw / 2)
                        
                        if is_hit:
                            # Index of Difficulty: ID = log2(2D/W)
                            id_val = math.log2((2 * self.dist) / self.tw)
                            self.results.append({
                                'trial': self.current_trial + 1,
                                'targetWidth': self.tw,
                                'targetDistance': self.dist,
                                'reactionTime_ms': int(mt * 1000)
                            })
                            
                            self.current_trial += 1
                            self.prev_x, self.prev_y = mx, my
                            
                            if self.current_trial >= TRIALS_PER_CONDITION:
                                self.save_data()
                                running = False
                            else:
                                self.reset_target()
                        else:
                            # provide feedback for miss?
                            pass
            
            self.draw()
            pygame.display.flip()
            self.clock.tick(60)
            
        pygame.quit()

    def save_data(self):
        # Professional touch: Ask for player name
        print("\n" + "="*30)
        user_name = input("Enter player name (default 'guest'): ").strip() or "guest"
        # Sanitize name for folder
        user_name = "".join([c for c in user_name if c.isalnum() or c in (' ', '_')]).replace(' ', '_')
        
        # Organize into results/<user_name>/
        out_dir = os.path.join("results", user_name)
        os.makedirs(out_dir, exist_ok=True)
        
        timestamp = int(time.time())
        filename = f"fitts_results_{self.condition.lower()}_{timestamp}.csv"
        filepath = os.path.join(out_dir, filename)
        
        # Save using pandas for clean CSV handling
        df = pd.DataFrame(self.results)
        df.to_csv(filepath, index=False)
        
        print(f"\nSUCCESS: Data saved to {filepath}")
        print(f"To analyze: python analyze_results.py --user {user_name}")
        print("="*30)

if __name__ == "__main__":
    import sys
    cond = sys.argv[1] if len(sys.argv) > 1 else "Head"
    exp = FittsExperiment()
    exp.run(condition=cond)
