#!/usr/bin/env python3
"""
Convert special UTF-8 symbols to ASCII-safe representations for viewing compatibility.
This is ONLY needed if your text editor/viewer doesn't support UTF-8 properly.
"""
import os
import glob
import shutil


# Symbol replacement map
SYMBOL_REPLACEMENTS = {
    # Mathematical symbols
    '≤': '<=',
    '≥': '>=',
    '±': '+/-',
    '×': 'x',
    '÷': '/',
    '≈': '~=',
    '≠': '!=',
    '°': ' degrees',
    
    # Typography
    '–': '-',  # en dash
    '—': '--',  # em dash
    ''': "'",  # smart quote left
    ''': "'",  # smart quote right
    '"': '"',  # smart quote left double
    '"': '"',  # smart quote right double
    '…': '...',  # ellipsis
    
    # Symbols (these are usually fine to keep)
    # '®': '(R)',
    # '™': '(TM)',
    # '©': '(C)',
}


def convert_to_ascii_safe(content):
    """Convert UTF-8 special symbols to ASCII-safe representations."""
    for utf8_symbol, ascii_repr in SYMBOL_REPLACEMENTS.items():
        content = content.replace(utf8_symbol, ascii_repr)
    return content


def process_files(input_dir, output_dir):
    """Process all markdown files."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    md_files = glob.glob(os.path.join(input_dir, "*.md"))
    
    stats = {
        'total': len(md_files),
        'converted': 0,
        'errors': 0
    }
    
    print(f"Converting {stats['total']} files to ASCII-safe format...")
    print("This replaces:")
    print("  ≤ → <=")
    print("  ≥ → >=")
    print("  ± → +/-")
    print("  – → -")
    print("  etc.\n")
    
    for file_path in md_files:
        try:
            filename = os.path.basename(file_path)
            output_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Convert symbols
            converted_content = convert_to_ascii_safe(content)
            
            # Write ASCII-safe version
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(converted_content)
            
            stats['converted'] += 1
            if stats['converted'] % 20 == 0:
                print(f"  Processed {stats['converted']}/{stats['total']} files...")
                
        except Exception as e:
            stats['errors'] += 1
            print(f"✗ Error processing {filename}: {e}")
    
    print(f"\n✓ Conversion complete!")
    print(f"  Total files: {stats['total']}")
    print(f"  Converted: {stats['converted']}")
    print(f"  Errors: {stats['errors']}")
    print(f"\nASCII-safe files saved to: {output_dir}")


if __name__ == "__main__":
    input_dir = "/Users/lucasdonizetecamargos/Downloads/app (6)/data/recommendations/md_docs"
    output_dir = "/Users/lucasdonizetecamargos/Downloads/app (6)/data/recommendations/md_docs_ascii"
    
    process_files(input_dir, output_dir)
