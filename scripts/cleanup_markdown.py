#!/usr/bin/env python3
"""
Clean control characters from markdown files converted from PDFs.
Removes form feeds and other control characters while preserving UTF-8 medical symbols.
"""
import os
import glob
import re
import shutil
import unicodedata


def sanitize_filename(filename):
    """Remove control characters and normalize Unicode in filenames."""
    # Remove control characters (ASCII 0-31 except newline/tab)
    filename = ''.join(char for char in filename if ord(char) >= 32 or char in '\n\t')
    # Remove leading/trailing whitespace
    filename = filename.strip()
    # Normalize Unicode (NFD -> NFC)
    filename = unicodedata.normalize('NFC', filename)
    return filename


def clean_markdown_content(content):
    """Remove unwanted control characters from markdown content."""
    # Remove form feed characters (page breaks from PDF)
    content = content.replace('\f', '\n\n')
    
    # Remove other control chars except newlines, carriage returns, tabs
    cleaned = []
    for char in content:
        # Keep only printable chars and common whitespace
        if ord(char) >= 32 or char in '\n\r\t':
            cleaned.append(char)
    content = ''.join(cleaned)
    
    # Normalize multiple blank lines to maximum 2
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # Remove trailing whitespace from each line
    lines = content.split('\n')
    lines = [line.rstrip() for line in lines]
    content = '\n'.join(lines)
    
    return content


def cleanup_files(directory, dry_run=False):
    """Clean all markdown files in the directory."""
    md_files = glob.glob(os.path.join(directory, "*.md"))
    
    stats = {
        'total': len(md_files),
        'cleaned_content': 0,
        'renamed': 0,
        'errors': 0
    }
    
    print(f"Found {stats['total']} markdown files to process.")
    
    for file_path in md_files:
        try:
            # Read original content
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # Clean content
            cleaned_content = clean_markdown_content(original_content)
            content_changed = cleaned_content != original_content
            
            # Check filename
            original_name = os.path.basename(file_path)
            sanitized_name = sanitize_filename(original_name)
            name_changed = sanitized_name != original_name
            
            if dry_run:
                if content_changed:
                    print(f"[DRY RUN] Would clean content: {original_name}")
                    stats['cleaned_content'] += 1
                if name_changed:
                    print(f"[DRY RUN] Would rename: {original_name} -> {sanitized_name}")
                    stats['renamed'] += 1
            else:
                # Write cleaned content
                if content_changed:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(cleaned_content)
                    stats['cleaned_content'] += 1
                    print(f"✓ Cleaned: {original_name}")
                
                # Rename if needed
                if name_changed:
                    new_path = os.path.join(directory, sanitized_name)
                    # Avoid overwriting
                    if os.path.exists(new_path):
                        print(f"⚠ Skipping rename (target exists): {original_name}")
                    else:
                        os.rename(file_path, new_path)
                        stats['renamed'] += 1
                        print(f"✓ Renamed: {original_name} -> {sanitized_name}")
        
        except Exception as e:
            stats['errors'] += 1
            print(f"✗ Error processing {os.path.basename(file_path)}: {e}")
    
    print(f"\n{'DRY RUN ' if dry_run else ''}Summary:")
    print(f"  Total files: {stats['total']}")
    print(f"  Content cleaned: {stats['cleaned_content']}")
    print(f"  Files renamed: {stats['renamed']}")
    print(f"  Errors: {stats['errors']}")
    
    return stats


if __name__ == "__main__":
    import sys
    
    md_dir = "/Users/lucasdonizetecamargos/Downloads/app (6)/data/recommendations/md_docs"
    
    # Check if dry run mode
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("Running in DRY RUN mode (no changes will be made)\n")
    else:
        # Create backup first
        backup_dir = "/Users/lucasdonizetecamargos/Downloads/app (6)/data/recommendations/md_docs_backup"
        if not os.path.exists(backup_dir):
            print(f"Creating backup at {backup_dir}...")
            shutil.copytree(md_dir, backup_dir)
            print("✓ Backup created\n")
    
    cleanup_files(md_dir, dry_run=dry_run)
