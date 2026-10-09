#!/usr/bin/env bash

OUTPUT_FILE="bundle.yaml"

# Clear output file if it exists
> "$OUTPUT_FILE"

# Loop through all yaml files (no quotes around the wildcard!)
for f in *.yaml *.yml; do
    [ -e "$f" ] || continue
    [ "$f" = "$OUTPUT_FILE" ] && continue
    
    echo "---" >> "$OUTPUT_FILE"
    cat "$f" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "Successfully created $OUTPUT_FILE"

