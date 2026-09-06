import sys

filepath = 'frontend/src/app/components/ticket-manager/ticket-manager.component.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('  @if (showForm) {')
if start_idx == -1:
    print('Not found')
    sys.exit(1)

end_marker = '  <!-- ══════ CHANNEL DASHBOARD VIEW ══════ -->'
end_idx = content.find(end_marker)

if end_idx == -1:
    print('End marker not found')
    sys.exit(1)

# Ensure we grab exactly up to the end marker
form_block = content[start_idx:end_idx]

# Remove the block from its current location
new_content = content[:start_idx] + content[end_idx:]

# Append it at the end of the file
new_content = new_content.strip() + '\n\n' + form_block

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
