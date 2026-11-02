from graphviz import Digraph
from pathlib import Path
from html import escape

out=Path(__file__).resolve().parent; out.mkdir(parents=True,exist_ok=True)
# Key table attributes. DBML is source of truth for every physical column/type.
T={
 'users': [('id','uuid','PK'),('email','varchar','UQ'),('role','varchar',''),('status','varchar','')],
 'processing_sessions':[('id','uuid','PK'),('created_by','uuid','FK'),('name','varchar',''),('status','varchar',''),('created_at','timestamptz','')],
 'import_batches':[('id','uuid','PK'),('session_id','uuid','FK'),('created_by','uuid','FK?'),('filename','varchar',''),('source_label','varchar',''),('row_count','bigint',''),('status','varchar','')],
 'source_records':[('id','uuid','PK'),('import_batch_id','uuid','FK'),('row_number','bigint',''),('raw_data','jsonb',''),('normalized_data','jsonb','')],
 'match_jobs':[('id','uuid','PK'),('session_id','uuid','FK'),('status','varchar',''),('candidate_count','bigint','')],
 'match_candidates':[('id','uuid','PK'),('job_id','uuid','FK'),('record_a_id','uuid','FK'),('record_b_id','uuid','FK'),('match_probability','double',''),('evidence','jsonb','')],
 'match_groups':[('id','uuid','PK'),('job_id','uuid','FK'),('status','varchar',''),('confidence','double',''),('created_at','timestamptz','')],
 'group_members':[('group_id','uuid','PK,FK'),('record_id','uuid','PK,FK'),('membership_score','double','')],
 'review_decisions':[('id','uuid','PK'),('group_id','uuid','FK'),('reviewer_id','uuid','FK'),('action','varchar',''),('merge_status','varchar',''),('reviewed_at','timestamptz','')],
 'master_records':[('id','uuid','PK'),('session_id','uuid','FK'),('master_code','varchar','UQ'),('canonical_data','jsonb',''),('updated_at','timestamptz','')],
 'master_links':[('id','uuid','PK'),('master_id','uuid','FK'),('record_id','uuid','FK'),('review_decision_id','uuid','FK?'),('status','varchar','')],
 'clean_exports':[('id','uuid','PK'),('session_id','uuid','FK,UQ'),('job_id','uuid','FK?'),('created_at','timestamptz',''),('status','varchar',''),('filename','varchar',''),('row_count','bigint','')],
}
COLORS={
 'user':'#e2e8f0', 'session':'#dbeafe','input':'#dcfce7','matching':'#ffedd5','review':'#f3e8ff','master':'#d1fae5','output':'#fee2e2'
}
category={
 'users':'user','processing_sessions':'session','import_batches':'input','source_records':'input',
 'match_jobs':'matching','match_candidates':'matching','match_groups':'matching','group_members':'matching',
 'review_decisions':'review','master_records':'master','master_links':'master',
 'clean_exports':'output'
}
# parent, child, fk column and whether FK nullable
REL=[
 ('users','processing_sessions','created_by',False),
 ('users','import_batches','created_by',True),
 ('users','review_decisions','reviewer_id',False),
 ('processing_sessions','import_batches','session_id',False),
 ('processing_sessions','match_jobs','session_id',False),
 ('processing_sessions','master_records','session_id',False),
 ('processing_sessions','clean_exports','session_id',False),
 ('import_batches','source_records','import_batch_id',False),
 ('match_jobs','match_candidates','job_id',False),
 ('match_jobs','match_groups','job_id',False),
 ('match_jobs','clean_exports','job_id',True),
 ('source_records','match_candidates','record_a_id',False),
 ('source_records','match_candidates','record_b_id',False),
 ('source_records','group_members','record_id',False),
 ('source_records','master_links','record_id',False),
 ('match_groups','group_members','group_id',False),
 ('match_groups','review_decisions','group_id',False),
 ('review_decisions','master_links','review_decision_id',True),
 ('master_records','master_links','master_id',False),
]

# Label uses an HTML table with color-coded PK/FK/UQ.
def label_table(name):
  bg=COLORS[category[name]]
  rows=[]
  rows.append(f'<TR><TD BGCOLOR="{bg}" COLSPAN="3" ALIGN="LEFT" CELLPADDING="8"><FONT POINT-SIZE="12"><B>{escape(name)}</B></FONT></TD></TR>')
  for i,(n,typ,marker) in enumerate(T[name]):
    sym= marker.replace(',','+') or ' '
    color = '#047857' if 'PK' in marker else '#2563eb' if 'FK' in marker else '#334155'
    shade = '#ffffff' if i%2==0 else '#f8fafc'
    rows.append(f'<TR><TD PORT="{n}" BGCOLOR="{shade}" ALIGN="LEFT" CELLPADDING="5"><FONT COLOR="{color}"><B>{escape(sym)}</B></FONT></TD><TD BGCOLOR="{shade}" ALIGN="LEFT" CELLPADDING="5">{escape(n)}</TD><TD BGCOLOR="{shade}" ALIGN="LEFT" CELLPADDING="5"><FONT COLOR="#64748b">{escape(typ)}</FONT></TD></TR>')
  return '<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" COLOR="#cbd5e1" STYLE="ROUNDED">'+''.join(rows)+'</TABLE>>'

def unique_fk(child, column):
  return any(name == column and 'UQ' in marker for name, _, marker in T[child])


# One connected ERD includes every table and foreign key.
filename='erd-tong-the'
d=Digraph(name=filename,engine='dot')
d.graph_attr.update(rankdir='LR',bgcolor='white',pad='.32',nodesep='.42',ranksep='1.45',splines='spline',outputorder='edgesfirst',dpi='144',fontname='Arial',label='UNIRA  |  ERD tổng hợp – 12 bảng, 19 quan hệ khóa ngoại',labelloc='t',labeljust='l',fontsize='19',fontcolor='#0f172a')
d.node_attr.update(shape='plain',fontname='Arial',fontsize='10')
d.edge_attr.update(color='#8293a9',penwidth='1.0',arrowsize='.7',dir='both',arrowtail='tee',arrowhead='crowodot',fontname='Arial',fontsize='8')
for name in T:
  d.node(name,label=label_table(name))
for parent,child,column,optional in REL:
  # A UNIQUE foreign key permits at most one child for each parent.
  tail='teeodot' if optional else 'tee'
  head='teeodot' if unique_fk(child,column) else 'crowodot'
  kw=dict(arrowtail=tail,arrowhead=head,headport=column+':w')
  if parent=='source_records' and child=='match_candidates':
    kw['constraint']='false' if column=='record_b_id' else 'true'
  d.edge(parent,child,**kw)
(out/(filename+'.dot')).write_text(d.source,encoding='utf-8')
d.render(filename=filename,directory=str(out),format='svg',cleanup=True)
d.render(filename=filename,directory=str(out),format='png',cleanup=True)
print(filename, 'OK')

# Produce a true ERD in Mermaid Crow's Foot with key attributes.
# The foreign-key relation is modeled precisely according to DBML.
attrib={}
for name,cols in T.items():
    attrib[name]=[(typ,n,marker) for n,typ,marker in cols]
lines=['erDiagram','    %% All 12 tables and 19 physical FK relationships in one ERD.','    %% Full column types and indexes are available in docs/schema.dbml.','    %% UNIQUE: source_records(import_batch_id, row_number).','    %% UNIQUE: match_candidates(job_id, record_a_id, record_b_id).','    %% At most one ACTIVE master_links row per record_id.']
for par,child,col,opt in REL:
    left='|o' if opt else '||'
    right='o|' if unique_fk(child,col) else 'o{'
    lines.append(f'    {par.upper()} {left}--{right} {child.upper()} : "{col}"')
for name,cols in attrib.items():
    lines.append(f'    {name.upper()} {{')
    for typ,n,mk in cols:
        normtyp={'double':'float','timestamptz':'timestamp','varchar':'varchar','uuid':'uuid','jsonb':'jsonb','text':'text','int':'int','bigint':'bigint'}[typ]
        # Mermaid supports comma-separated key tags, including FK,UK.
        indicator = ' '+mk.replace('?', '').replace('UQ', 'UK') if mk else ''
        lines.append('        '+normtyp+' '+n+indicator)
    lines.append('    }')
(out/'erd-tong-the.mmd').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('done')
