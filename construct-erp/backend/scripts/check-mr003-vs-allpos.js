require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const STOP = new Set(['work','for','of','and','to','in','at','the','with','a','an','is','nos','no','per','wo','supply','fix','fixing','&','/','-','mm','cm','kg','mt','sqm','cum','rft','ltr','grade','type','size','class','as','req','including','make','brand','thick','thk']);
function tokens(name) {
  return (name||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>1&&!STOP.has(w));
}
function overlap(a,b){const ta=new Set(tokens(a)),tb=new Set(tokens(b));let h=0;for(const w of ta)if(tb.has(w))h++;return h;}

(async () => {
  const c = await pool.connect();

  // MR-003 items
  const mr = await c.query(`SELECT mr.id, mr.created_at::date AS mr_date FROM material_requisitions mr JOIN projects p ON p.id=mr.project_id WHERE LOWER(p.project_code)='wdiry0151' AND mr.serial_no_formatted='BCIM-TQS-BLR-MR-003'`);
  const mrid = mr.rows[0].id; const mrDate = mr.rows[0].mr_date;
  const mritems = await c.query(`SELECT material_name,quantity,unit FROM mrs_items WHERE mrs_id=$1 ORDER BY sort_order`,[mrid]);
  console.log('=== MR-003 | date: '+mrDate+' ===');
  mritems.rows.forEach((i,n)=>console.log('  '+(n+1)+'. '+i.material_name+' | '+i.quantity+' '+i.unit));
  console.log();

  // All POs for project
  const proj = await c.query(`SELECT id FROM projects WHERE LOWER(project_code)='wdiry0151' AND is_active=true`);
  const pid = proj.rows[0].id;
  const pos = await c.query(`SELECT id,po_number,serial_no_formatted,po_date,mrs_id FROM purchase_orders WHERE project_id=$1 AND status!='cancelled' ORDER BY po_date ASC NULLS LAST`,[pid]);

  const results = [];
  for (const r of pos.rows) {
    const poitems = await c.query(`SELECT material_name,quantity,unit FROM po_items WHERE po_id=$1 ORDER BY sort_order`,[r.id]);
    let score=0, pairs=[];
    for(const mi of mritems.rows){
      let best={score:0,poMat:'',poQty:'',poUnit:''};
      for(const pi of poitems.rows){
        const s=overlap(mi.material_name,pi.material_name);
        if(s>best.score)best={score:s,poMat:pi.material_name,poQty:pi.quantity,poUnit:pi.unit};
      }
      if(best.score>0){score+=best.score;pairs.push({mrMat:mi.material_name,poMat:best.poMat,poQty:best.poQty,poUnit:best.poUnit,s:best.score});}
    }
    if(score>0) results.push({poLabel:(r.serial_no_formatted||r.po_number),date:(r.po_date||'').toString().slice(0,10),score,pairs,allItems:poitems.rows,mrsId:r.mrs_id});
  }

  results.sort((a,b)=>b.score-a.score);
  console.log('Top matching POs (sorted by score):');
  console.log('─'.repeat(80));
  for(const res of results){
    console.log('\n'+res.poLabel+' | '+res.date+' | score: '+res.score+' | linked: '+(res.mrsId||'no'));
    console.log('  PO items:');
    res.allItems.forEach((i,n)=>console.log('    '+(n+1)+'. '+i.material_name+' | '+i.quantity+' '+i.unit));
    console.log('  Matching pairs:');
    res.pairs.sort((a,b)=>b.s-a.s).forEach(p=>console.log('    ['+p.s+'] '+p.mrMat+' <-> '+p.poMat+' ('+p.poQty+' '+p.poUnit+')'));
  }
  if(!results.length) console.log('No matches found (score > 0)');

  c.release(); await pool.end();
})();
