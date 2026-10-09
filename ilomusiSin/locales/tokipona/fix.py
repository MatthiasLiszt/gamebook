python3 -c '
import sys, re

with open("bundle7.yaml", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Preserve document separators, empty lines, and comments
    if line.strip().startswith("---") or not line.strip() or line.strip().startswith("#"):
        new_lines.append(line)
        continue
    
    # Match YAML key-value pairs (e.g. key: value)
    match = re.match(r"^(\s*[\w\d_-]+:\s*)(.+)$", line)
    if match:
        prefix, val = match.groups()
        val_str = val.strip()
        # If value is unquoted or multi-word with special chars, wrap in double quotes
        if not (val_str.startswith("\"") and val_str.endswith("\"")) and not (val_str.startswith("\x27") and val_str.endswith("\x27")):
            # Escape inner double quotes if any
            val_escaped = val_str.replace("\"", "\\\"")
            new_lines.append(f"{prefix}\"{val_escaped}\"\n")
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open("bundle7.yaml", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("bundle7.yaml fixed successfully!")
'