import os
import shutil

AI_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure target directories exist
models_dir = os.path.join(AI_DIR, "models")
reports_dir = os.path.join(AI_DIR, "reports")
datasets_dir = os.path.join(AI_DIR, "datasets")
explainability_dir = os.path.join(AI_DIR, "explainability")

os.makedirs(models_dir, exist_ok=True)
os.makedirs(reports_dir, exist_ok=True)
os.makedirs(datasets_dir, exist_ok=True)
os.makedirs(explainability_dir, exist_ok=True)

nested_models = os.path.join(AI_DIR, "ai", "models")
nested_reports = os.path.join(AI_DIR, "ai", "reports")
nested_datasets = os.path.join(AI_DIR, "ai", "datasets")

# Copy models
if os.path.exists(nested_models):
    for f in os.listdir(nested_models):
        src = os.path.join(nested_models, f)
        dst = os.path.join(models_dir, f)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print(f"Copied model {f} -> {dst}")

# Copy reports
if os.path.exists(nested_reports):
    for f in os.listdir(nested_reports):
        src = os.path.join(nested_reports, f)
        dst = os.path.join(reports_dir, f)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print(f"Copied report {f} -> {dst}")

# Copy datasets
if os.path.exists(nested_datasets):
    for f in os.listdir(nested_datasets):
        src = os.path.join(nested_datasets, f)
        dst = os.path.join(datasets_dir, f)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print(f"Copied dataset {f} -> {dst}")

print("Path synchronization completed.")
