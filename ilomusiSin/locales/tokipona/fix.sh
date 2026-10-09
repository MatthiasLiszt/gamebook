#!/usr/bin/env bash

# Check if a filename argument was provided
if [ -z "$1" ]; then
    echo "Usage: ./fix_bundle.sh <filename>"
    exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "Error: File '$FILE' not found in current directory."
    exit 1
fi

python3 - "$FILE" << 'EOF'
import sys, re

filename = sys.argv[1]

with open(filename, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Preserve document separators, empty lines, and comments
    if line.strip().startswith("---") or not line.strip() or line.strip().startswith("#"):
        new_lines.append(line)
        continue
    
    # Match key-value pairs (e.g., key: value)
    match = re.match(r"^(\s*[\w\d_-]+:\s*)(.+)$", line)
    if match:
        prefix, val = match.groups()
        val_str = val.strip()
        # If the value is not already enclosed in quotes, quote it safely
        if not (val_str.startswith('"') and val_str.endswith('"')) and not (val_str.startswith("'") and val_str.endswith("'")):
            val_escaped = val_str.replace('"', '\\"')
            new_lines.append(f'{prefix}"{val_escaped}"\n')
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(filename, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Successfully fixed YAML formatting in {filename}")
EOF