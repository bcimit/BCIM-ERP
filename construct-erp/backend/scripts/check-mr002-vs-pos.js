require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const STOP = new Set(['work','for','of','and','to','in','at','the','with','a','an','is','nos','no','per','wo','supply','fix','fixing','&','/','-','mm','cm','kg','mt','sqm','cum','rft','ltr','grade','type','size','class','as','req','including','make','brand']);
function tokens(name) {
  return (name||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>1&&!STOP.has(w));
}
function overlap(a,b){const ta=new Set(tokens(a)),tb=new Set(tokens(b));let h=0;for(const w of ta)if(tb.has(w))h++;return h;}

(async () => {
  const c = await pool.connect();

  // MR-002 items
  const mr = await c.query(`SELECT mr.id, mr.created_at::date AS mr_date FROM material_requisitions mr JOIN projects p ON p.id=mr.project_id WHERE LOWER(p.project_code)='wdiry0151' AND mr.serial_no_formatted='BCIM-TQS-BLR-MR-002'`);
  const mrid = mr.rows[0].id;
  const mrDate = mr.rows[0].mr_date;
  const mritems = await c.query(`SELECT material_name, quantity, unit FROM mrs_items WHERE mrs_id=$1 ORDER BY sort_order`,[mrid]);
  console.log('=== MR-002 | date: '+mrDate+' ===');
  mritems.rows.forEach((i,n)=>console.log('  '+(n+1)+'. '+i.material_name+' | '+i.quantity+' '+i.unit));
  console.log();

  // First 10 POs
  const poNums = ['POTQS001','POTQS002','POTQS003','POTQS004','POTQS005','POTQS006','POTQS007','POTQS008','POTQS009','POTQS010'];
  for (const poNo of poNums) {
    const po = await c.query(`SELECT id,po_number,serial_no_formatted,po_date,mrs_id FROM purchase_orders WHERE po_number=$1 OR serial_no_formatted=$1`,[poNo]);
    if (!po.rows.length){console.log(poNo+': NOT FOUND\n');continue;}
    const r=po.rows[0];
    const poitems = await c.query(`SELECT material_name,quantity,unit FROM po_items WHERE po_id=$1 ORDER BY sort_order`,[r.id]);

    // Score: sum of best overlap per MR item
    let totalScore=0, bestPairs=[];
    for(const mi of mritems.rows){
      let best={score:0,poMat:''};
      for(const pi of poitems.rows){
        const s=overlap(mi.material_name,pi.material_name);
        if(s>best.score)best={score:s,poMat:pi.material_name};
      }
      if(best.score>0){totalScore+=best.score;bestPairs.push({mrMat:mi.material_name,poMat:best.poMat,score:best.score});}
    }

    const poLabel=(r.serial_no_formatted||r.po_number);
    const dateStr=(r.po_date||'').toString().slice(0,10);
    console.log('--- '+poLabel+' | '+dateStr+' | score: '+totalScore+' | mrs_id: '+(r.mrs_id||'null')+' ---');
    poitems.rows.forEach((i,n)=>console.log('  PO '+(n+1)+'. '+i.material_name+' | '+i.quantity+' '+i.unit));
    if(bestPairs.length){
      console.log('  Matching pairs:');
      bestPairs.sort((a,b)=>b.score-a.score).forEach(p=>console.log('    ['+p.score+'] MR: '+p.mrMat+' <-> PO: '+p.poMat));
    }
    console.log();
  }

  c.release(); await pool.end();
})();
