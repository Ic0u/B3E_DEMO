// Behavior Graph Editor using Cytoscape.js

// CDN scripts must be loaded in HTML before this script

(function(){
  // Add zoom limits and other settings to prevent infinite expansion/lag
  const cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    minZoom: 0.2,
    maxZoom: 3,
    panningEnabled: true,
    userPanningEnabled: true,
    autoungrabify: false,
    style: [
      { selector: 'node', style: {
          // Main label - show node type
          'label': function(ele) {
            if (!ele.data) return '';
            // Use type as the main label, or extract it from the label
            return ele.data('type') || (ele.data('label') ? ele.data('label').split(' ')[0] : '');
          },
          'text-valign': 'center',
          'color': '#f8f8f2', // Dracula foreground
          'font-size': 16,
          'font-weight': 600,
          'text-transform': 'uppercase',
          'background-color': '#44475a', // Dracula selection background
          'border-width': 2,
          'border-color': ele => ele.data ? (ele.data('typeColor') || '#6272a4') : '#6272a4',
          'border-opacity': 0.9,
          'shape': 'round-rectangle',
          'padding': '16px',
          'text-wrap': 'wrap',
          'text-max-width': '140px',
          'transition-property': 'background-color, width, height, border-color, font-size, opacity',
          'transition-duration': '250ms',
          'width': 170, // Fixed width
          'height': 60,  // Fixed height
          'text-outline-width': 1,
          'text-outline-opacity': 0.3
      }},
      // Style for subtitle nodes
      { selector: '.subtitle-node', style: {
          'background-opacity': 0,
          'border-opacity': 0,
          'color': '#cccccc',
          'font-size': 12,
          'font-weight': 400,
          'text-transform': 'none',
          'text-valign': 'bottom',
          'text-margin-y': -8,
          'text-opacity': 0.7
      }},
      { selector: 'edge', style: {
          'width': 1.5,
          'line-color': '#ffffff', // White lines 
          'curve-style': 'straight', // Straight lines for classic behavior trees
          'opacity': 1,
          'line-opacity': 1,
          'text-rotation': 'autorotate',
          'text-margin-y': -10,
          'target-arrow-shape': 'triangle', // Triangle arrow heads
          'target-arrow-color': '#ffffff',
          'target-arrow-fill': 'filled', // Filled triangles
          'arrow-scale': 0.8, // Smaller arrows
          'source-arrow-shape': 'none'
      }},
      { selector: 'edge:selected', style: {
          'width': 3,
          'line-color': '#ff79c6', // Dracula pink
          'target-arrow-color': '#ff79c6',
          'line-opacity': 1,
          'z-index': 9
      }},
      { selector: 'edge.hover', style: {
          'width': 3,
          'line-color': '#bd93f9', // Dracula purple
          'target-arrow-color': '#bd93f9',
          'line-opacity': 1,
          'z-index': 9
      }},
      { selector: '.eh-handle', style:{ 
          'background-color':'#3b82f6',
          'width': 12,
          'height': 12,
          'shape':'ellipse',
          'overlay-opacity': 0,
          'border-width': 2,
          'border-color': '#ffffff',
          'border-opacity': 0.8,
          'shadow-blur': 10,
          'shadow-color': '#000000',
          'shadow-opacity': 0.5
      }},
      { selector: '.eh-hover', style:{ 
          'background-color':'#60a5fa'
      }},
      { selector: '.eh-ghost', style:{
          'background-color':'#60a5fa',
          'opacity': 0.2
      }},
      { selector: '.eh-preview', style:{
          'line-color':'#60a5fa',
          'line-style': 'dashed',
          'target-arrow-color': '#60a5fa'
      }},
      { selector: '.selected', style:{ 
          'border-width': 4,
          'border-color': '#ff79c6', // Dracula pink
          'background-color': '#50465a' // Slightly lighter with pink hint
      }},
      { selector: 'node.hover', style:{ 
          'background-color': '#4c5067', // Slightly lighter than Dracula selection
          'border-width': 3.5
      }}
    ],
    layout: { name: 'grid' },
    wheelSensitivity:0.5 // Default value to avoid warning
  });

  // Style setup complete
  
  // Edgehandles init
  let eh;
  
  // Initialize edge handles with standard behavior
  setTimeout(() => {
    try {
      eh = cy.edgehandles({
        handleNodes: 'node', // Standard behavior for all nodes
        handlePosition: 'middle top',
        handleInDrawMode: false,
        snapThreshold: 20,
        snapFrequency: 15,
        noEdgeEventsInDraw: true,
        disableBrowserGestures: true,
        hoverDelay: 150,
        edgeType: 'straight', // Use straight lines instead of bezier
        loopAllowed: function(){
          return false; // prevent self-loops
        }
      });
    } catch (err) {
      console.log('Edge handles already initialized or error:', err);
    }
  }, 500); // Delay to ensure cytoscape is fully initialized

  // Node palette buttons
  const palette = [
    {type:'Sequence', color:'#8be9fd', icon:'fa-list-ol'},     // Cyan
    {type:'Selector', color:'#bd93f9', icon:'fa-code-branch'}, // Purple
    {type:'Action', color:'#50fa7b', icon:'fa-play'},          // Green
    {type:'Condition', color:'#ffb86c', icon:'fa-question'},   // Orange
    {type:'Decorator', color:'#ff79c6', icon:'fa-star'}        // Pink
  ];
  
  // Add tool divider and title to sidebar
  const sidebar = document.getElementById('sidebar');
  const actionBar = document.getElementById('actionBar');
  
  // Add title to sidebar
  const titleDiv = document.createElement('div');
  titleDiv.className = 'sidebar-title';
  titleDiv.innerHTML = '<i class="fa-solid fa-sitemap"></i>';
  titleDiv.title = "Behavior Tree Nodes";
  sidebar.appendChild(titleDiv);
  
  // Add divider
  const divider = document.createElement('div');
  divider.className = 'sidebar-divider';
  sidebar.appendChild(divider);
  
  // Add node buttons
  palette.forEach(item=>{
    const btn=document.createElement('button');
    btn.className = 'sidebar-btn';
    btn.innerHTML = `<i class="fa-solid ${item.icon}"></i>`;
    btn.title = item.type;
    btn.style.color = '#fff';
    btn.style.borderLeft = `3px solid ${item.color}`;
    btn.addEventListener('click',()=>addNode(item.type,item.color));
    sidebar.appendChild(btn);
  });

  /* --------- Top-right action bar --------- */
  function addAction(icon, title, handler){
    const b=document.createElement('button');
    b.className='icon-btn';
    b.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    b.title=title;
    b.addEventListener('click',handler);
    actionBar.appendChild(b);
  }
  
  // Add title to action bar
  const actionTitle = document.createElement('div');
  actionTitle.className = 'sidebar-title';
  actionTitle.innerHTML = '<i class="fa-solid fa-gear"></i>';
  actionTitle.title = "Tools";
  actionBar.appendChild(actionTitle);
  
  // Add divider
  const actionDivider = document.createElement('div');
  actionDivider.className = 'sidebar-divider';
  actionBar.appendChild(actionDivider);
  
  let isFull=false;
  addAction('fa-expand', 'Fullscreen', ()=>{
    const el=document.documentElement;
    if(!isFull){
      if(el.requestFullscreen){el.requestFullscreen();}
      isFull=true;
    }
  });
  addAction('fa-compress', 'Exit Fullscreen', ()=>{
    if(document.fullscreenElement){document.exitFullscreen();}
    isFull=false;
  });
  addAction('fa-magnifying-glass-plus', 'Zoom In', ()=>{
    const newZoom = Math.min(cy.maxZoom(), cy.zoom()*1.2);
    cy.zoom({level: newZoom, renderedPosition: {x: cy.width()/2, y: cy.height()/2}});
  });
  addAction('fa-magnifying-glass-minus', 'Zoom Out', ()=>{
    const newZoom = Math.max(cy.minZoom(), cy.zoom()*0.8);
    cy.zoom({level: newZoom, renderedPosition: {x: cy.width()/2, y: cy.height()/2}});
  });
  const ur = cy.undoRedo ? cy.undoRedo({}) : null;
  addAction('fa-rotate-right', 'Redo', ()=>{ur && ur.redo();});
  addAction('fa-rotate-left', 'Undo', ()=>{ur && ur.undo();});

  function uniq(){return 'n'+Math.random().toString(36).substr(2,6);}

  function addNode(type,color){
    const id = uniq();
    
    // Create the main node
    const newNode = cy.add({
      group:'nodes',
      data:{
        id,
        type: type,          // Type is used for main label
        label: type + ' ' + id,  // Keep for backwards compatibility
        typeColor: color
      },
      position:{x:Math.random()*400+100,y:Math.random()*300+100},
      style:{opacity:0}
    });
    
    // Add a subtitle node as a child
    cy.add({
      group:'nodes',
      data:{
        id: id + '-subtitle',
        parent: id,
        label: id
      },
      classes: 'subtitle-node'
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

  // Simple function to ensure straight lines for behavior trees
  function optimizeEdgeCurves() {
    // For classic behavior trees, we use straight lines
    cy.edges().forEach(edge => {
      edge.style({
        'curve-style': 'straight',
        'line-color': '#ffffff',
        'opacity': 1,
        'width': 1.5,
        'target-arrow-color': '#ffffff'
      });
    });
  }
  
  function autoLayout(){
    // Tree layout with proper vertical alignment to match user's reference image
    
    // First, get all the nodes (excluding subtitles)
    const mainNodes = cy.nodes().filter(n => !n.hasClass('subtitle-node'));
    
    // Find roots - nodes without incoming edges
    const roots = mainNodes.filter(node => node.indegree() === 0);
    if (roots.length === 0) return; // No roots to layout
    
    // Track processed nodes to avoid duplicates
    let processed = new Set();
    
    // Clear any existing manual layout
    cy.nodes().forEach(node => {
      node.removeData('originalPosition');
    });
    
    // Define spacing constants
    const levelHeight = 180;      // Increased vertical space between levels
    const siblingSpacing = 250;   // Increased horizontal space between siblings
    
    // Find the tree height (max levels)
    const getTreeDepth = (node, currentDepth) => {
      if (!node) return 0;
      
      const children = node.outgoers('node').filter(n => !n.hasClass('subtitle-node'));
      if (children.length === 0) return currentDepth;
      
      let maxDepth = currentDepth;
      children.forEach(child => {
        const childDepth = getTreeDepth(child, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      });
      
      return maxDepth;
    };
    
    // For each tree (starting from a root), calculate width requirements
    const calculateSubtreeWidth = (node) => {
      if (!node) return 0;
      
      const children = node.outgoers('node').filter(n => !n.hasClass('subtitle-node'));
      if (children.length === 0) return siblingSpacing;
      
      let totalWidth = 0;
      children.forEach(child => {
        totalWidth += calculateSubtreeWidth(child);
      });
      
      return Math.max(siblingSpacing, totalWidth);
    };
    
    // Position a node and all its descendants
    const positionSubtree = (node, level, horizontalCenter) => {
      if (processed.has(node.id())) return;
      processed.add(node.id());
      
      // Position this node
      const yPos = 100 + level * levelHeight;
      node.position({ x: horizontalCenter, y: yPos });
      
      // Position its subtitle
      const subtitle = cy.$(`#${node.id()}-subtitle`);
      if (subtitle.length) {
        subtitle.position({ x: horizontalCenter, y: yPos });
      }
      
      // Position all children
      const children = node.outgoers('node').filter(n => !n.hasClass('subtitle-node'));
      if (children.length === 0) return;
      
      // Calculate total width needed
      const totalChildrenWidth = children.reduce((sum, child) => {
        return sum + calculateSubtreeWidth(child);
      }, 0);
      
      // Position each child
      let currentX = horizontalCenter - (totalChildrenWidth / 2);
      children.forEach(child => {
        const childWidth = calculateSubtreeWidth(child);
        const childCenter = currentX + (childWidth / 2);
        positionSubtree(child, level + 1, childCenter);
        currentX += childWidth;
      });
    };
    
    // Layout each connected component (tree) starting from roots
    let xOffset = 400;
    roots.forEach(root => {
      const rootWidth = calculateSubtreeWidth(root);
      positionSubtree(root, 0, xOffset + rootWidth/2);
      xOffset += rootWidth + 150; // Increased gap between trees
    });
    
    // Make all edges straight lines
    cy.edges().forEach(edge => {
      edge.style({
        'curve-style': 'straight',
        'line-color': '#ffffff',
        'opacity': 1,
        'width': 1.5,
        'target-arrow-color': '#ffffff'
      });
    });
    
    // Final adjustments and view fit
    setTimeout(() => {
      // Fit the view with more padding
      cy.fit(cy.elements(), 80);
    }, 100);
  }

  const autoBtnEl = document.getElementById('autoBtn');
  if(autoBtnEl){autoBtnEl.addEventListener('click',autoLayout);}

  // Hover elevation effect
  cy.on('mouseover','node', e=> e.target.addClass('hover'));
  cy.on('mouseout','node', e=> e.target.removeClass('hover'));
  
  // Edge hover effects
  cy.on('mouseover','edge', e=> e.target.addClass('hover'));
  cy.on('mouseout','edge', e=> e.target.removeClass('hover'));

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
    try {
      if(cy.elements().length) return; // prevent double-load
      
      const typeColorMap = {
        'Sequence':'#8be9fd', // Cyan
        'Selector':'#bd93f9', // Purple
        'Action':'#50fa7b',   // Green
        'Condition':'#ffb86c', // Orange
        'Decorator':'#ff79c6'  // Pink
      };
      
      // Create a better demo tree structure that matches the reference image
      cy.batch(function() {
        // Add nodes - hierarchical structure like in the reference image
        cy.add([
          // Root node at top
          {
            data: {
              id: 'dec1',
              type: 'Decorator',
              label: 'Decorator dec1',
              typeColor: typeColorMap['Decorator']
            }
          },
          // Level 1 - sequence and selector
          {
            data: {
              id: 'seq1',
              type: 'Sequence',
              label: 'Sequence seq1',
              typeColor: typeColorMap['Sequence']
            }
          },
          {
            data: {
              id: 'sel2',
              type: 'Selector',
              label: 'Selector sel2',
              typeColor: typeColorMap['Selector']
            }
          },
          // Level 2 - children of seq1
          {
            data: {
              id: 'act1',
              type: 'Action',
              label: 'Action a1',
              typeColor: typeColorMap['Action']
            }
          },
          {
            data: {
              id: 'sel1',
              type: 'Selector',
              label: 'Selector sel1',
              typeColor: typeColorMap['Selector']
            }
          },
          // Level 2 - children of sel2
          {
            data: {
              id: 'cond2',
              type: 'Condition',
              label: 'Condition c2',
              typeColor: typeColorMap['Condition']
            }
          },
          {
            data: {
              id: 'act3',
              type: 'Action',
              label: 'Action a3',
              typeColor: typeColorMap['Action']
            }
          },
          // Level 3 - children of sel1
          {
            data: {
              id: 'cond1',
              type: 'Condition',
              label: 'Condition c1',
              typeColor: typeColorMap['Condition']
            }
          },
          {
            data: {
              id: 'act2',
              type: 'Action',
              label: 'Action a2',
              typeColor: typeColorMap['Action']
            }
          },
          // Extra action node for sel2
          {
            data: {
              id: 'act4',
              type: 'Action',
              label: 'Action a4',
              typeColor: typeColorMap['Action']
            }
          }
        ]);
        
        // Add subtitle nodes to match your example
        cy.add([
          // Root
          {
            data: {
              id: 'dec1-subtitle',
              parent: 'dec1',
              label: 'dec1'
            },
            classes: 'subtitle-node'
          },
          // Level 1
          {
            data: {
              id: 'seq1-subtitle',
              parent: 'seq1',
              label: 'seq1'
            },
            classes: 'subtitle-node'
          },
          {
            data: {
              id: 'sel2-subtitle',
              parent: 'sel2',
              label: 'sel2'
            },
            classes: 'subtitle-node'
          },
          // Level 2
          {
            data: {
              id: 'act1-subtitle',
              parent: 'act1',
              label: 'a1'
            },
            classes: 'subtitle-node'
          },
          {
            data: {
              id: 'sel1-subtitle',
              parent: 'sel1',
              label: 'sel1'
            },
            classes: 'subtitle-node'
          },
          {
            data: {
              id: 'cond2-subtitle',
              parent: 'cond2',
              label: 'c2'
            },
            classes: 'subtitle-node'
          },
          {
            data: {
              id: 'act3-subtitle',
              parent: 'act3',
              label: 'a3'
            },
            classes: 'subtitle-node'
          },
          // Level 3
          {
            data: {
              id: 'cond1-subtitle',
              parent: 'cond1',
              label: 'c1'
            },
            classes: 'subtitle-node'
          },
          {
            data: {
              id: 'act2-subtitle',
              parent: 'act2',
              label: 'a2'
            },
            classes: 'subtitle-node'
          },
          {
            data: {
              id: 'act4-subtitle',
              parent: 'act4',
              label: 'a4'
            },
            classes: 'subtitle-node'
          }
        ]);
        
        // Add edges to create the tree structure
        cy.add([
          // From root to level 1
          {
            data: {
              id: 'e1',
              source: 'dec1',
              target: 'seq1'
            }
          },
          {
            data: {
              id: 'e2',
              source: 'dec1',
              target: 'sel2'
            }
          },
          // From seq1 to level 2
          {
            data: {
              id: 'e3',
              source: 'seq1',
              target: 'act1'
            }
          },
          {
            data: {
              id: 'e4',
              source: 'seq1',
              target: 'sel1'
            }
          },
          // From sel1 to level 3
          {
            data: {
              id: 'e5',
              source: 'sel1',
              target: 'cond1'
            }
          },
          {
            data: {
              id: 'e6',
              source: 'sel1',
              target: 'act2'
            }
          },
          // From sel2 to level 2
          {
            data: {
              id: 'e7',
              source: 'sel2',
              target: 'cond2'
            }
          },
          {
            data: {
              id: 'e8',
              source: 'sel2',
              target: 'act3'
            }
          },
          {
            data: {
              id: 'e9',
              source: 'sel2',
              target: 'act4'
            }
          }
        ]);
      });
      
      // Run the new, improved layout
      setTimeout(() => {
        autoLayout();
        hidePreloader();
      }, 100);
    } catch (err) {
      console.log('Error loading demo:', err);
      hidePreloader();
    }
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
  // Add another divider for file operations
  const fileDivider = document.createElement('div');
  fileDivider.className = 'sidebar-divider';
  actionBar.appendChild(fileDivider);
  
  addAction('fa-download','Export JSON',exportJson);
  addAction('fa-upload','Import JSON',triggerImport);

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

  // Add another divider for layout
  const layoutDivider = document.createElement('div');
  layoutDivider.className = 'sidebar-divider';
  actionBar.appendChild(layoutDivider);
  
  // Auto-layout control button in actionBar
  addAction('fa-diagram-project','Auto Layout',autoLayout);
  
  // No light mode toggle
})();
