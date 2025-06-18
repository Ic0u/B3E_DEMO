// Behavior Graph Editor using Cytoscape.js

// CDN scripts must be loaded in HTML before this script

(function(){
  const cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
      { selector: 'node', style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'color': '#e5e7eb',
          'font-size':13,
          'background-color': '#2d3748',
          'border-width':3,
          'border-color': ele => ele.data('typeColor') || '#4b5563',
          'shape': 'round-rectangle',
          'padding':'10px',
          'text-wrap':'wrap',
          'transition-property':'background-color, width, height, border-color, font-size',
          'transition-duration':'200ms',
          'width':'label'

      }},
      { selector: 'edge', style: {
          'width':2,
          'line-color':'#9ca3af',
          'target-arrow-color':'#9ca3af',
          'target-arrow-shape':'triangle',
          'curve-style':'bezier'
      }},
      { selector: '.eh-handle', style:{ 'background-color':'#1d4ed8','width':8,'height':8,'shape':'ellipse','overlay-opacity':0 }},
      { selector: '.eh-hover', style:{ 'background-color':'#2563eb' }},
      { selector: '.selected', style:{ 'border-width':3,'border-color':'#f59e0b' }},
      { selector: 'node.hover', style:{ 'background-color':'#4b5563' }}
    ],
    layout: { name: 'grid' },
    wheelSensitivity:0.2
  });

  // Edgehandles init
  let eh;
  if(cy.edgehandles){
    eh = cy.edgehandles({
      handleNodes: 'node',
      handlePosition: 'bottom center'
    });
  }

  // Node palette buttons
  const palette = [
    {type:'Sequence', color:'#10b981'},
    {type:'Selector', color:'#6366f1'},
    {type:'Action', color:'#3b82f6'},
    {type:'Condition', color:'#f59e0b'},
    {type:'Decorator', color:'#ef4444'}
  ];
  const sidebar = document.getElementById('sidebar');
  const actionBar = document.getElementById('actionBar');
  palette.forEach(item=>{
    const btn=document.createElement('button');
    btn.textContent=item.type.charAt(0); // show first letter on compact toolbar
    btn.style.background=item.color;
    btn.style.color='#fff';
    btn.addEventListener('click',()=>addNode(item.type,item.color));
    sidebar.appendChild(btn);
  });

  /* --------- Top-right action bar --------- */
  function addAction(label,title,handler){
    const b=document.createElement('button');
    b.className='icon-btn';
    b.textContent=label;
    b.title=title;
    b.addEventListener('click',handler);
    actionBar.appendChild(b);
  }
  let isFull=false;
  addAction('Full','Fullscreen',()=>{
    const el=document.documentElement;
    if(!isFull){
      if(el.requestFullscreen){el.requestFullscreen();}
      isFull=true;
    }
  });
  addAction('Exit','Exit Fullscreen',()=>{
    if(document.fullscreenElement){document.exitFullscreen();}
    isFull=false;
  });
  addAction('+','Zoom In',()=>{
    cy.zoom({level: cy.zoom()*1.2, renderedPosition: {x:0,y:0}});
  });
  addAction('-','Zoom Out',()=>{
    cy.zoom({level: cy.zoom()*0.8, renderedPosition: {x:0,y:0}});
  });
  const ur = cy.undoRedo ? cy.undoRedo({}) : null;
  addAction('Redo','Redo',()=>{ur && ur.redo();});
  addAction('Undo','Undo',()=>{ur && ur.undo();});

  function uniq(){return 'n'+Math.random().toString(36).substr(2,6);}
  function addNode(type,color){
    const id = uniq();
    const newNode = cy.add({
      group:'nodes',
      data:{id,label:type+' '+id,typeColor:color},
      position:{x:Math.random()*400+100,y:Math.random()*300+100},
      style:{opacity:0}
    });
    // fade-in animation
    newNode.animate({style:{opacity:1}}, {duration:300});
  }

  // Selection and delete
  document.addEventListener('keydown',e=>{
    if(e.key==='Delete'){
      cy.$(':selected').remove();
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='l'){
      autoLayout();
    }
  });

  function autoLayout(){
    cy.layout({
      name:'dagre',
      nodeSep:30,
      rankDir:'TB',
      animate:true,
      animationDuration:500
    }).run();
  }

  const autoBtnEl = document.getElementById('autoBtn');
  if(autoBtnEl){autoBtnEl.addEventListener('click',autoLayout);}

  // Hover elevation effect
  cy.on('mouseover','node', e=> e.target.addClass('hover'));
  cy.on('mouseout','node', e=> e.target.removeClass('hover'));

  // Validate one-parent rule on edge addition
  cy.on('add', 'edge', evt=>{
    const edge=evt.target;
    const target=edge.target();
    const incoming=target.incomers('edge');
    if(incoming.length>1){
      edge.remove();
      alert('Each node can only have one parent.');
    }
  });

  function hidePreloader(){
    const pl=document.getElementById('preloader');
    if(pl){
      pl.classList.add('hide');
      setTimeout(()=>pl.remove(),500);
    }
  }
  // hide automatically when window fully loads (fallback)
  window.addEventListener('load',()=>{setTimeout(hidePreloader,300);});

  // ----- Demo graph on first load -----
  function loadDemoGraph(){
    if(cy.elements().length) return; // prevent double-load
    const typeColorMap = {
      'Sequence':'#10b981',
      'Selector':'#6366f1',
      'Action':'#3b82f6',
      'Condition':'#f59e0b',
      'Decorator':'#ef4444'
    };
    const nodes=[
      {id:'root', type:'Sequence'},
      {id:'a1', type:'Action'},
      {id:'sel1', type:'Selector'},
      {id:'c1', type:'Condition'},
      {id:'a2', type:'Action'},
      {id:'dec1', type:'Decorator'},
      {id:'sel2', type:'Selector'},
      {id:'c2', type:'Condition'},
      {id:'a3', type:'Action'},
      {id:'a4', type:'Action'}
    ].map((n,i)=>({
      group:'nodes',
      data:{id:n.id,label:n.type+' '+n.id,typeColor:typeColorMap[n.type]},
      position:{x:i*120, y:0}
    }));
    const edges=[
      {source:'root', target:'a1'},
      {source:'root', target:'sel1'},
      {source:'root', target:'dec1'},
      {source:'sel1', target:'c1'},
      {source:'sel1', target:'a2'},
      {source:'dec1', target:'sel2'},
      {source:'sel2', target:'c2'},
      {source:'sel2', target:'a3'},
      {source:'sel2', target:'a4'}
    ].map((e,i)=>({
      group:'edges',
      data:{id:'e'+i, source:e.source, target:e.target}
    }));
    cy.add([...nodes,...edges]);
    autoLayout();
    hidePreloader();
  }
  loadDemoGraph();

    // ----- Import / Export JSON -----
  const fileInputEl = document.getElementById('fileInput');
  function exportJson(){
    const json = cy.json();
    const blob = new Blob([JSON.stringify(json)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'behavior_graph.json';
    a.click();
  }
  function triggerImport(){ fileInputEl && fileInputEl.click(); }
  addAction('Export','Export JSON',exportJson);
  addAction('Import','Import JSON',triggerImport);

  if(fileInputEl){
    fileInputEl.addEventListener('change',e=>{
      const file=e.target.files[0];
      if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{
        const data=JSON.parse(ev.target.result);
        cy.json({elements:data.elements});
        cy.fit();
      };
      reader.readAsText(file);

    });
  }

  // Auto-layout control button in actionBar
  addAction('Layout','Auto Layout',autoLayout);
})();
