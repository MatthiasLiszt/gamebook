import os
import re
import yaml

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
NAMES_FILE = os.path.join(DATA_DIR, "names.yaml")
LOCALES_DIR = os.path.join(BASE_DIR, "locales")


def slugify_name(name: str) -> str:
    """Converts 'Lone Wolf' -> 'char_lone_wolf'."""
    clean = re.sub(r"[^\w\s]", "", name).strip().lower()
    clean = re.sub(r"\s+", "_", clean)
    return f"char_{clean}"


def load_yaml(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def save_yaml(path, data):
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, sort_keys=False, allow_unicode=True, default_flow_style=False)


def refactor_data_files():
    # Load or initialize central names.yaml
    central_names_data = load_yaml(NAMES_FILE)
    names_registry = central_names_data.get("names", {})

    modified_files = 0

    for root, _, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith((".yaml", ".yml")) and file != "names.yaml":
                file_path = os.path.join(root, file)
                updated = False

                with open(file_path, "r", encoding="utf-8") as f:
                    docs = list(yaml.safe_load_all(f))

                for doc in docs:
                    if not isinstance(doc, dict):
                        continue

                    # Check characters in scene context
                    scene = doc.get("scene", {})
                    characters = scene.get("characters_present", [])

                    if isinstance(characters, list):
                        new_characters = []
                        for char in characters:
                            if isinstance(char, dict) and "tokipona_name" in char:
                                orig_name = char.get("original_name", "Unknown")
                                tp_name = char.get("tokipona_name", "")
                                key = char.get("name_key") or slugify_name(orig_name)

                                # Register in central names database
                                if key not in names_registry:
                                    names_registry[key] = {
                                        "original_name": orig_name,
                                        "tokipona_name": tp_name,
                                    }

                                # Replace direct tokipona_name with key reference
                                new_characters.append({"name_key": key})
                                updated = True
                            else:
                                new_characters.append(char)

                        if updated:
                            scene["characters_present"] = new_characters

                if updated:
                    with open(file_path, "w", encoding="utf-8") as f:
                        yaml.dump_all(docs, f, sort_keys=False, allow_unicode=True, default_flow_style=False)
                    modified_files += 1
                    print(f"[Refactored] {file_path}")

    # Save central names.yaml
    central_names_data["names"] = names_registry
    save_yaml(NAMES_FILE, central_names_data)
    print(f"[Updated] Centralized {len(names_registry)} name entries in {NAMES_FILE}")


def update_locale_files():
    """Populates locale files with character name keys from names.yaml."""
    names_registry = load_yaml(NAMES_FILE).get("names", {})
    if not names_registry:
        return

    for root, _, files in os.walk(LOCALES_DIR):
        for file in files:
            if file.endswith((".yaml", ".yml")):
                locale_path = os.path.join(root, file)
                locale_data = load_yaml(locale_path)

                updated = False
                for key, val in names_registry.items():
                    if key not in locale_data:
                        # Fallback to tokipona_name or original_name based on path/file
                        name_value = val.get("tokipona_name") if "toki" in root.lower() or "tp" in root.lower() else val.get("original_name")
                        locale_data[key] = name_value
                        updated = True

                if updated:
                    save_yaml(locale_path, locale_data)
                    print(f"[Updated Locale] Added missing keys to {locale_path}")


if __name__ == "__main__":
    refactor_data_files()
    update_locale_files()
    print("Tokipona name refactoring completed successfully.")