import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Boxes, Layers3, RefreshCw, Search, ShieldCheck, Workflow } from "lucide-react";
import { api, type AdsaSnapshot, type Product, type TrieNode, type AvlNode } from "./lib/api";
import { supabase } from "./lib/supabase";
import "./ADSALabPage.css";

function AvlTree({ node, activePrice }: { node: AvlNode | null; activePrice: number | null }) {
  if (!node) return <div className="adsa-empty-structure">No products yet - AVL tree is empty.</div>;
  const width = (n: AvlNode | null): number => !n ? 0 : Math.max(1, width(n.left) + width(n.right));
  const span = Math.max(1, width(node));
  const levels = (n: AvlNode | null): number => !n ? 0 : 1 + Math.max(levels(n.left), levels(n.right));
  const height = levels(node);
  const nodes: { n: AvlNode; x: number; y: number; parentX?: number; parentY?: number }[] = [];
  const walk = (n: AvlNode | null, start: number, depth: number, parent?: {x:number;y:number}) => {
    if (!n) return;
    const leftWidth = width(n.left);
    const x = ((start + leftWidth + 0.5) / span) * Math.max(760, span * 92);
    const y = 52 + depth * 112;
    nodes.push({n,x,y,parentX:parent?.x,parentY:parent?.y});
    walk(n.left,start,depth+1,{x,y}); walk(n.right,start+leftWidth+1,depth+1,{x,y});
  };
  walk(node,0,0);
  const svgWidth = Math.max(760, span*92);
  return <div className="adsa-tree-scroll"><svg className="adsa-tree-svg" width={svgWidth} height={Math.max(160,height*112+30)} viewBox={`0 0 ${svgWidth} ${Math.max(160,height*112+30)}`}>
    {nodes.filter(v=>v.parentX!==undefined).map((v,i)=><line key={`e${i}`} x1={v.parentX} y1={v.parentY!+22} x2={v.x} y2={v.y-22} className="adsa-edge"/>)}
    {nodes.map(({n,x,y})=><g key={`${n.price}-${x}`} className={activePrice===n.price?"adsa-node active":"adsa-node"}>
      <circle cx={x} cy={y} r="27"/><text x={x} y={y+4} textAnchor="middle">{n.price.toLocaleString("en-IN",{maximumFractionDigits:0})}</text>
      <text x={x} y={y+43} textAnchor="middle" className="adsa-node-meta">h:{n.height} | bf:{n.balance}</text>
    </g>)}
  </svg></div>;
}
function TrieBranch({ node, label="ROOT", depth=0 }: {node:TrieNode;label?:string;depth?:number}) {
  return <div className="trie-branch" style={{"--depth":depth} as CSSProperties}>
    <div className={`trie-node ${node.terminal?"terminal":""}`}><b>{label}</b>{node.terminal&&<small>END | {node.productIds.length}</small>}</div>
    {node.children.length>0&&<div className="trie-children">{node.children.map(child=><TrieBranch key={child.char} node={child.node} label={child.char} depth={depth+1}/>)}</div>}
  </div>;
}
export default function ADSALabPage() {
  const [checking,setChecking]=useState(true);
  const [allowed,setAllowed]=useState(false);
  const [snapshot,setSnapshot]=useState<AdsaSnapshot|null>(null);
  const [products,setProducts]=useState<Product[]>([]);
  const [pending,setPending]=useState(0);
  const [source,setSource]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [rotationIndex,setRotationIndex]=useState(-1);
  const [query,setQuery]=useState("");
  const [searchResults,setSearchResults]=useState<string[]|null>(null);
  const [activeTab,setActiveTab]=useState("avl");
  const productMap=useMemo(()=>new Map(products.map(p=>[p.id,p])),[products]);
  useEffect(()=>{let live=true; (async()=>{try{const {data}=await supabase.auth.getUser();if(!data.user)return;const {data:profile}=await supabase.from("profiles").select("role").eq("id",data.user.id).single();if(live)setAllowed(profile?.role==="owner");}catch{}finally{if(live)setChecking(false);}})();return()=>{live=false;};},[]);
  async function load(){setLoading(true);setError("");try{const result=await api.getOwnerAdsaSnapshot();setSnapshot(result.snapshot);setProducts(result.products);setPending(result.pendingRestockCount);setSource(result.source);setRotationIndex(result.snapshot.rotations.length?0:-1);setSearchResults(null);}catch(e){setError(e instanceof Error?e.message:"Could not load ADSA structures.");}finally{setLoading(false);}}
  useEffect(()=>{if(allowed)void load();},[allowed]);
  async function searchTrie(){if(!query.trim())return;try{const r=await api.getAdsaAutocomplete(query.trim());setSearchResults(r.results);}catch(e){setError(e instanceof Error?e.message:"Trie search failed.");}}
  if(checking)return <main className="adsa-lab-page"><p>Verifying owner access...</p></main>;
  if(!allowed)return <main className="adsa-lab-page"><div className="adsa-access"><ShieldCheck size={34}/><h1>Owner access required</h1><p>Sign in with an approved store owner account.</p><Link to="/login?role=owner">Owner login</Link></div></main>;
  const rotations=snapshot?.rotations??[];
  const heap=snapshot?.heap??[];
  const heapNodes=heap.map((item,index)=>({item,index,x:((index+1)/(heap.length+1))*760,y:48+Math.floor(Math.log2(index+1))*100}));
  return <main className="adsa-lab-page">
    <header className="adsa-lab-top"><div><Link to="/admin" className="adsa-back"><ArrowLeft size={16}/> Back to dashboard</Link><span className="adsa-kicker">SHOP.CORNER / DATA STRUCTURES LAB</span><h1>ADSA <em>Visual Lab</em></h1><p>Live structure snapshots from your store's C++ inventory engine.</p></div><button className="adsa-refresh" onClick={()=>void load()} disabled={loading}><RefreshCw size={16} className={loading?"spin":""}/>{loading?"Refreshing...":"Refresh structures"}</button></header>
    {error&&<div className="adsa-error">{error}</div>}
    <section className="adsa-metrics"><article><Boxes/><span>Products indexed</span><strong>{snapshot?.productCount??"-"}</strong></article><article><Activity/><span>AVL rotations</span><strong>{rotations.length}</strong></article><article><Layers3/><span>Hash capacity</span><strong>{snapshot? snapshot.hash.length:"-"}</strong></article><article><Workflow/><span>Pending FIFO requests</span><strong>{pending}</strong></article></section>
    <nav className="adsa-tabs">{[["avl","AVL Tree"],["hash","Hash Table"],["trie","Trie"],["heap","Min Heap"],["fifo","FIFO Queue"]].map(([id,label])=><button key={id} className={activeTab===id?"selected":""} onClick={()=>setActiveTab(id)}>{label}</button>)}</nav>
    {!snapshot?<div className="adsa-loading">{loading?"Building real C++ structures...":"No snapshot loaded."}</div>:<>
    {activeTab==="avl"&&<section className="adsa-panel"><div className="adsa-panel-heading"><div><span>01 / SELF-BALANCING SEARCH TREE</span><h2>AVL price index</h2><p>Nodes show price, height and balance factor. Edges are actual parent-child links.</p></div><div className="adsa-rotation-controls"><button disabled={!rotations.length} onClick={()=>setRotationIndex(i=>Math.max(0,i-1))}>Previous</button><button disabled={!rotations.length} onClick={()=>setRotationIndex(i=>Math.min(rotations.length-1,i+1))}>Next rotation</button></div></div><AvlTree node={snapshot.avl} activePrice={rotationIndex>=0?rotations[rotationIndex]?.pivotPrice??null:null}/><div className="adsa-rotation-log"><b>Insertion rotation log</b>{rotations.length?rotations.map((r,i)=><button key={`${r.type}-${i}`} className={i===rotationIndex?"current":""} onClick={()=>setRotationIndex(i)}><strong>{r.type}</strong><span>{r.type==="LL"?"Right rotation":r.type==="RR"?"Left rotation":r.type==="LR"?"Left + right rotation":"Right + left rotation"}</span><small>pivot {r.pivotPrice}</small></button>):<p>No rotations were needed while indexing this inventory.</p>}</div></section>}
    {activeTab==="hash"&&<section className="adsa-panel"><div className="adsa-panel-heading"><div><span>02 / CONSTANT-TIME LOOKUP</span><h2>Hash table | separate chaining</h2><p>101 buckets using the C++ engineâ€™s actual hash function. Empty buckets are dimmed.</p></div><div className="adsa-pill">{snapshot.hash.filter(b=>b.entries.length).length} occupied buckets</div></div><div className="hash-grid">{snapshot.hash.map(bucket=><div key={bucket.index} className={`hash-bucket ${bucket.entries.length?"occupied":""}`}><b>{bucket.index}</b><div>{bucket.entries.length?bucket.entries.map((entry,i)=><div className="hash-entry" key={`${entry.key}-${i}`} title={entry.name}><strong>{entry.key.length>15?entry.key.slice(0,12)+"...":entry.key}</strong><small>{entry.name}</small></div>):<span className="hash-empty">-</span>}</div></div>)}</div></section>}
    {activeTab==="trie"&&<section className="adsa-panel"><div className="adsa-panel-heading"><div><span>03 / PREFIX SEARCH</span><h2>Product-name trie</h2><p>Each branch is a character edge; highlighted terminal nodes complete a product name.</p></div></div><div className="trie-search"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void searchTrie()} placeholder="Try a product prefix..."/><button onClick={()=>void searchTrie()}><Search size={16}/> Search prefix</button></div>{searchResults&&<div className="trie-results">Matched {searchResults.length} product(s): {searchResults.map(id=>productMap.get(id)?.name??id).join(", ")||"No matches"}</div>}<div className="trie-scroll"><TrieBranch node={snapshot.trie}/></div></section>}
    {activeTab==="heap"&&<section className="adsa-panel"><div className="adsa-panel-heading"><div><span>04 / LOW-STOCK PRIORITY</span><h2>Min heap</h2><p>Array order from the C++ min heap. Parent stock is always less than or equal to child stock.</p></div><div className="adsa-pill">Root = minimum stock</div></div>{heap.length?<><div className="adsa-tree-scroll"><svg className="adsa-tree-svg" width="760" height={Math.max(150,(Math.floor(Math.log2(heap.length))+1)*100)} viewBox={`0 0 760 ${Math.max(150,(Math.floor(Math.log2(heap.length))+1)*100)}`}>{heapNodes.filter(v=>v.index>0).map(v=>{const parent=heapNodes[Math.floor((v.index-1)/2)];return <line key={`h${v.index}`} x1={parent.x} y1={parent.y+22} x2={v.x} y2={v.y-22} className="adsa-edge"/>})}{heapNodes.map(({item,index,x,y})=><g key={item.productId} className={`adsa-node ${index===0?"active":""}`}><circle cx={x} cy={y} r="25"/><text x={x} y={y+4} textAnchor="middle">{item.stock}</text><text x={x} y={y+40} textAnchor="middle" className="adsa-node-meta">{productMap.get(item.productId)?.name?.slice(0,18)??item.productId.slice(0,8)}</text></g>)}</svg></div><div className="heap-array"><b>Heap array</b>{heap.map((h,i)=><span key={h.productId}><small>{i}</small>{h.stock}</span>)}</div></>:<div className="adsa-empty-structure">Heap is empty.</div>}</section>}
    {activeTab==="fifo"&&<section className="adsa-panel"><div className="adsa-panel-heading"><div><span>05 / RESTOCK REQUEST ORDER</span><h2>FIFO queue</h2><p>Pending requests loaded oldest-first, then passed through the C++ queue.</p></div><div className="adsa-pill">{snapshot.fifo.length} waiting</div></div><div className="fifo-lane"><div className="fifo-end">FRONT<br/><small>DEQUEUE</small></div>{snapshot.fifo.length?snapshot.fifo.map((id,i)=><div className="fifo-item" key={id}><small>#{i+1}</small><strong>{productMap.get(id)?.name??id.slice(0,12)}</strong><span>{productMap.get(id)?.product_code??"Restock request"}</span></div>):<div className="adsa-empty-structure">No pending restock requests in the queue.</div>}<div className="fifo-end">REAR<br/><small>ENQUEUE</small></div></div></section>}
    </>}
    <footer className="adsa-source"><ShieldCheck size={15}/><span>{source||"Owner-scoped data only. Structures are generated by the C++ engine."}</span></footer>
  </main>;
}
