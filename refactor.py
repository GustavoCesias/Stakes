import re
import os

filepath = 'frontend/src/app/components/ticket-manager/ticket-manager.component.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('  @if (showForm) {')
if start_idx == -1:
    print('Not found')
    exit(1)

end_marker = 'CHANNEL DASHBOARD VIEW'
end_idx = content.find(end_marker)

if end_idx == -1:
    print('End marker not found')
    exit(1)

end_idx = content.rfind('  }', 0, end_idx) + 3

form_block = content[start_idx:end_idx]

# Remove the form block from its original position
new_content = content[:start_idx] + content[end_idx:]

# Modify the form block to be a modal
modal_form_block = form_block.replace(
    '<div class="bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300">',
    '<div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" (click)="toggleForm()">\n  <div class="bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative transition-all duration-300 w-[95%] max-w-5xl max-h-[95vh] flex flex-col" (click)="$event.stopPropagation()">'
)

modal_form_block = modal_form_block.replace(
    '  }\n',
    '  </div>\n</div>\n}\n'
)

modal_form_block = modal_form_block.replace(
    '<form (ngSubmit)="saveTicket()" class="space-y-8 relative z-10">',
    '<div class="overflow-y-auto custom-scrollbar relative z-10 pr-2">\n      <form (ngSubmit)="saveTicket()" class="space-y-8">'
)

modal_form_block = modal_form_block.replace(
    '    </form>\n  </div>\n</div>',
    '    </form>\n    </div>\n  </div>\n</div>'
)

close_btn_html = '''        <button type="button" (click)="toggleForm()" class="text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg p-1.5 ml-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>'''

modal_form_block = modal_form_block.replace(
    '      </div>\n    </div>',
    close_btn_html
)

# Move modal to end of file
new_content = new_content + '\n<!-- ══════ FORMULARIO NUEVO TICKET (MODAL) ══════ -->\n' + modal_form_block

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
