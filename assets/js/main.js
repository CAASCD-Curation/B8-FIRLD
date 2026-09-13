/* ═══════════ 田·四向档案 — scroll narrative engine ═══════════ */
(function(){
"use strict";
gsap.registerPlugin(ScrollTrigger);
const D = window.ARCHIVE_DATA;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ── 时钟 ── */
function tick(){
  const t = new Date();
  const s = String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0");
  $("#clock").textContent = s+"H";
  $("#footClock").textContent = s+"H · 北京时间";
}
tick(); setInterval(tick,1000);

/* ── 等高线生成器 ── */
function blob(cx,cy,r,seed,step){
  let d="";
  for(let a=0;a<=step;a++){
    const t=a/step*Math.PI*2;
    const rr=r*(1+0.18*Math.sin(t*3+seed)+0.1*Math.sin(t*5+seed*1.7));
    const x=cx+rr*Math.cos(t), y=cy+rr*0.72*Math.sin(t);
    d+=(a===0?"M":"L")+x.toFixed(1)+" "+y.toFixed(1)+" ";
  }
  return d+"Z";
}
function contours(g,cx,cy,r0,n,seed){
  let h="";
  for(let i=0;i<n;i++) h+='<path d="'+blob(cx,cy,r0+i*16,seed+i*0.6,72)+'"/>';
  g.innerHTML=h;
}

/* ═══════════ 00 PRELOADER ═══════════ */
const preGrid=$("#preGrid");
for(let i=0;i<96;i++){const c=document.createElement("i");if(Math.random()<0.07)c.classList.add("hot");preGrid.appendChild(c);}
document.body.style.overflow="hidden";
const cnt={v:0};
const pre=gsap.timeline({onComplete:startSite});
pre.to("#preGrid i",{scale:1,duration:.5,ease:"power2.out",stagger:{each:.008,grid:[8,12],from:"random"}})
   .to(cnt,{v:209,duration:1.4,ease:"power2.inOut",onUpdate:()=>{$("#preCount").textContent=String(Math.round(cnt.v)).padStart(3,"0");}},"-=.3")
   .to(".pre-tian-frame",{opacity:1,duration:.5,ease:"power2.out"},"-=1")
   .fromTo(".pre-tian",{scale:.5},{scale:1,duration:.8,ease:"back.out(1.6)"},"-=.7")
   .to({},{duration:.55})
   .to(".pre-logo",{opacity:0,scale:1.12,duration:.45,ease:"power2.in"})
   .to("#preGrid i",{scale:0,duration:.45,ease:"power2.in",stagger:{each:.006,grid:[8,12],from:"center"}},"-=.2")
   .to(".pre-meta",{opacity:0,duration:.3},"<")
   .set("#preloader",{display:"none"});
$("#preloader").addEventListener("click",()=>pre.progress(1));

function startSite(){
  document.body.style.overflow="";
  gsap.to("#gridLines i",{scaleY:1,duration:1.2,ease:"power3.inOut",stagger:.05});
  gsap.to("#topbar",{y:0,duration:.8,ease:"power3.out",delay:.3});
  heroIn();
  ScrollTrigger.refresh();
}

/* grid lines */
for(let i=0;i<13;i++) $("#gridLines").appendChild(document.createElement("i"));

/* ═══════════ HERO ═══════════ */
contours($("#heroContours"),300,300,26,7,1.3);
contours($("#heroContours"),640,180,20,5,4.1);
contours($("#heroContours"),540,420,16,4,2.2);
(function(){ // 田字格地块
  let h="";
  for(let r=0;r<4;r++)for(let c=0;c<6;c++){
    const w=54+((r*7+c*13)%3)*22, x=60+c*140+((r*31)%40), y=40+r*120+((c*17)%36);
    h+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+(w*0.66)+'"/>';
  }
  $("#heroFields").innerHTML=h;
})();
$$(".ht-line").forEach(l=>{l.innerHTML='<span class="ht-inner" style="display:inline-block">'+l.textContent+"</span>";});
function heroIn(){
  const tl=gsap.timeline();
  tl.from(".ht-char",{scale:0,transformOrigin:"50% 100%",duration:1,ease:"back.out(1.4)"})
    .from(".ht-inner",{yPercent:115,duration:.9,ease:"power4.out",stagger:.1},"-=.6")
    .from(".hero-top span",{opacity:0,y:12,stagger:.1,duration:.5},"-=.6")
    .from("#heroContours path",{opacity:0,duration:.06,stagger:.02},"-=.4")
    .from("#heroFields rect",{opacity:0,scale:.6,transformOrigin:"center",stagger:.015,duration:.3},"<")
    .from(".hb-left a",{opacity:0,x:-16,stagger:.08,duration:.4},"-=.5")
    .from(".hb-right li",{opacity:0,x:16,stagger:.07,duration:.4},"<")
    .from(".hb-mid",{opacity:0,duration:.5},"-=.2");
}
gsap.to(".hero-map",{yPercent:14,ease:"none",scrollTrigger:{trigger:"#hero",start:"top top",end:"bottom top",scrub:true}});

/* ═══════════ 领土路线 ═══════════ */
contours($("#routeContours"),250,220,30,8,2.6);
contours($("#routeContours"),880,520,36,9,0.8);
contours($("#routeContours"),980,180,20,5,5.2);
contours($("#routeContours"),420,600,18,4,3.3);
(function(){
  let h="";
  for(let r=0;r<5;r++)for(let c=0;c<8;c++){
    if((r*3+c*5)%4===0)continue;
    const x=70+c*135+((r*23)%30), y=60+r*130+((c*29)%34), w=58+((r*11+c*7)%4)*18;
    h+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+(w*0.6)+'"/>';
  }
  $("#routeFields").innerHTML=h;
})();
const routePath=$("#routePath");
const rLen=routePath.getTotalLength();
const stopNames=[["00","形式灵感档案"],["01","经典艺术档案"],["02","社会素材档案"],["03","文学意向档案"]];
const stopsG=$("#routeStops");
[0,.34,.67,1].forEach((f,i)=>{
  const p=routePath.getPointAtLength(rLen*f);
  const anchor=i===3?"end":"start", lx=i===3?p.x-16:p.x+16;
  stopsG.innerHTML+='<g class="r-stop" data-i="'+i+'" opacity="0">'
    +'<circle class="route-stop-dot" cx="'+p.x+'" cy="'+p.y+'" r="9"/>'
    +'<circle cx="'+p.x+'" cy="'+p.y+'" r="3.4" fill="#c8401f"/>'
    +'<text class="route-stop-label" x="'+lx+'" y="'+(p.y-4)+'" text-anchor="'+anchor+'">'+stopNames[i][0]+" · "+stopNames[i][1]+'</text>'
    +'<text class="route-stop-sub" x="'+lx+'" y="'+(p.y+16)+'" text-anchor="'+anchor+'">'+["形式与网格","艺术与图像","制度与现场","诗歌与辞赋"][i]+'</text></g>';
});
const routeTL=gsap.timeline({scrollTrigger:{
  trigger:"#route",start:"top top",end:"+=260%",pin:"#routePin",scrub:.6,
  onUpdate:st=>{
    const n=Math.min(3,Math.floor(st.progress*4.2));
    $$(".route-stops li").forEach((li,i)=>li.classList.toggle("on",i<=n&&st.progress>0.04));
  }}});
routeTL.fromTo(routePath,{strokeDasharray:rLen,strokeDashoffset:rLen},{strokeDashoffset:0,ease:"none",duration:1});
[0,.34,.67,1].forEach((f,i)=>{
  routeTL.to('.r-stop[data-i="'+i+'"]',{opacity:1,duration:.05},Math.max(.001,f*.92));
  routeTL.from('.r-stop[data-i="'+i+'"] circle',{scale:0,transformOrigin:"center",duration:.06},Math.max(.001,f*.92));
});

/* ═══════════ 渲染：03 文学意向（无图意象卡） ═══════════ */
const litList=$("#litList");
D.literature.forEach((e,i)=>{
  litList.appendChild(rowItem(i,{
    title:e.quote, tags:e.tags,
    desc:e.note, source:e.source, era:e.era, note:e.note, quote:true
  }));
});

/* ═══════════ 渲染：01 形式灵感（按原分类分组） ═══════════ */
const groups=[];
D.form.forEach(e=>{
  const c=e.cat||"未分组";
  let g=groups.find(g=>g.name===c);
  if(!g){g={name:c,items:[]};groups.push(g);}
  g.items.push(e);
});
const fg=$("#formGroups");
groups.forEach((g,gi)=>{
  const sec=document.createElement("div");
  sec.className="form-group";
  sec.innerHTML='<div class="fg-title"><span class="mono">'+String(gi+1).padStart(2,"0")+'</span><h3>'+g.name+'</h3><span class="mono">'+g.items.length+' 条</span></div>';
  const list=document.createElement("div");list.className="form-rows";
  g.items.forEach((e,ii)=>list.appendChild(rowItem(ii,e)));
  sec.appendChild(list);fg.appendChild(sec);
});

/* ═══════════ 01 经典艺术：统一档案卡片 ═══════════ */
const artList=$("#artList");
D.art.forEach((e,i)=>artList.appendChild(rowItem(i,e)));

/* ═══════════ 03 社会素材：索引 ═══════════ */
const socList=$("#socList");
D.society.forEach((e,i)=>socList.appendChild(rowItem(i,e)));

/* 统一档案卡片：图版 + 标题 + 胶囊标签 + 备注，点击弹出详情弹窗 */
function rowItem(i,e){
  const el=document.createElement("div");el.className="row-item"+(e.quote?" is-quote no-fig":"");
  if(e.quote){
    /* 文学意向卡：预览只显示意象本身 */
    el.innerHTML='<div class="row-head">'
      +'<span class="row-idx mono">'+String(i+1).padStart(2,"0")+'</span>'
      +'<h3 class="row-title">「'+e.title+'」</h3>'
      +'<span class="row-cta mono">查看详情 +</span>'
      +'</div>';
  }else{
    el.innerHTML=(e.img
        ?'<div class="row-fig"><img src="'+e.img+'" alt="'+e.title+'" loading="lazy"><i class="row-fade"></i></div>'
        :'<div class="row-fig row-fig-empty"><span>田</span><i class="row-fade"></i></div>')
      +'<div class="row-head">'
      +'<span class="row-idx mono">'+String(i+1).padStart(2,"0")+'</span>'
      +'<h3 class="row-title">'+e.title+'</h3>'
      +'<div class="row-tags">'+e.tags.slice(0,4).map(t=>'<span class="tag">'+t+'</span>').join('')+'</div>'
      +'<p class="row-brief">'+(e.note||e.desc||"")+'</p>'
      +'</div>';
  }
  el.addEventListener("click",()=>openModal(e,i));
  return el;
}

/* ── 详情弹窗 ── */
const modal=document.createElement("div");modal.id="archModal";
modal.innerHTML='<div class="am-back"></div><div class="am-card"><button class="am-close" aria-label="关闭">×</button><div class="am-scroll"></div></div>';
document.body.appendChild(modal);
const amScroll=modal.querySelector(".am-scroll");
gsap.set(modal.querySelector(".am-card"),{xPercent:-50,yPercent:-50});
function openModal(e,i){
  amScroll.innerHTML=(e.img?'<div class="am-fig"><img src="'+e.img+'" alt="'+e.title+'"><i class="row-fade"></i></div>':'')
    +'<div class="am-body">'
    +'<span class="row-idx mono">'+String(i+1).padStart(2,"0")+'</span>'
    +(e.quote?'<h3 class="am-quote">「'+e.title+'」</h3>':'<h3 class="am-title">'+e.title+'</h3>')
    +(e.desc?'<p class="am-desc">'+e.desc+'</p>':'')
    +'<p class="r-src mono">'+[e.source,e.era].filter(Boolean).join(" · ")+'</p>'
    +(e.note?'<p class="r-note">'+e.note+'</p>':'')
    +'<div class="row-tags">'+e.tags.map(t=>'<span class="tag">'+t+'</span>').join('')+'</div>'
    +'</div>';
  amScroll.scrollTop=0;
  modal.classList.add("on");document.body.style.overflow="hidden";
  gsap.fromTo(".am-back",{opacity:0},{opacity:1,duration:.3});
  gsap.fromTo(".am-card",{yPercent:-46,opacity:0,scale:.96},{yPercent:-50,opacity:1,scale:1,duration:.45,ease:"power3.out"});
}
function closeModal(){
  gsap.to(".am-card",{yPercent:-48,opacity:0,duration:.25,ease:"power2.in"});
  gsap.to(".am-back",{opacity:0,duration:.25,onComplete:()=>{
    modal.classList.remove("on");document.body.style.overflow="";
    gsap.set(".am-card",{yPercent:-50,clearProps:"opacity,scale"});
  }});
}
modal.querySelector(".am-back").addEventListener("click",closeModal);
modal.querySelector(".am-close").addEventListener("click",closeModal);
window.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&modal.classList.contains("on"))closeModal()});

/* ═══════════ 04 瀑布流构图 ═══════════ */
const mItems=[
 {t:"img",img:"archive/form_14.jpg",ar:"4/3",cap:["01 形式灵感","荷兰郁金香田 · 马赛克色块"]},
 {t:"quote",cls:"",q:"羁鸟恋旧林，池鱼思故渊。开荒南野际，守拙归园田。",s:"陶渊明《归园田居·其一》",tags:["归隐田园","田园向往"]},
 {t:"img",img:"archive/form_13.png",ar:"16/10",cap:["01 形式灵感","普罗旺斯薰衣草田 · 色块条带"]},
 {t:"quote",cls:"red",q:"麦地。别人看见你，觉得你温暖，美丽。我则站在你痛苦质问的中心。",s:"海子《麦地》",tags:["当代诗","麦地"]},
 {t:"quote",cls:"paper",q:"土地平旷，屋舍俨然，有良田美池桑竹之属。阡陌交通，鸡犬相闻。",s:"陶渊明《桃花源记》",tags:["桃花源理想","田园向往"]},
 {t:"img",img:"archive/society_08.png",ar:"3/4",cap:["03 社会素材","哈尼梯田 · 四素同构"]},
 {t:"quote",cls:"",q:"雨我公田，遂及我私。",s:"《诗经·小雅·大田》",tags:["丰收喜悦","农事生产","祭祀祈年"]},
 {t:"img",img:"archive/art_00.png",ar:"4/3",cap:["02 经典艺术","勃鲁盖尔《收割者》· 1565"]},
 {t:"quote",cls:"paper",q:"方里而井，井九百亩，其中为公田。八家皆私百亩，同养公田。",s:"《孟子·滕文公上》· 井田制",tags:["井田","九宫格","理想国"]},
 {t:"img",img:"archive/form_12.jpg",ar:"16/10",cap:["01 形式灵感","圆形灌溉田 · 大地波点"]},
 {t:"quote",cls:"",q:"漠漠水田飞白鹭，阴阴夏木啭黄鹂。",s:"王维《积雨辋川庄作》",tags:["禅意田园","水田风光"]},
 {t:"img",img:"archive/form_09.jpg",ar:"4/3",cap:["03 社会素材","稻田艺术 · 大地画布"]},
 {t:"quote",cls:"red",q:"田家少闲月，五月人倍忙。夜来南风起，小麦覆陇黄。",s:"白居易《观刈麦》",tags:["农事生产","民生疾苦"]},
 {t:"img",img:"archive/form_08.png",ar:"3/4",cap:["03 社会素材","龙脊梯田 · 山有多高田有多高"]},
 {t:"quote",cls:"paper",q:"结庐在人境，而无车马喧。采菊东篱下，悠然见南山。",s:"陶渊明《饮酒·其五》",tags:["自然审美","归隐田园"]},
 {t:"img",img:"archive/art_01.png",ar:"16/10",cap:["02 经典艺术","米勒《拾穗者》· 1857"]},
];
const mc=$("#mColumns");
mItems.forEach(m=>{
  const d=document.createElement("div");d.className="m-item";
  if(m.t==="img"){
    d.innerHTML='<div class="m-img" style="--ar:'+m.ar+'"><img src="assets/img/'+m.img+'" alt="'+m.cap[1]+'" loading="lazy"></div>'
      +'<div class="m-cap mono"><span>'+m.cap[0]+'</span><span>'+m.cap[1]+'</span></div>';
  }else{
    d.innerHTML='<div class="m-quote '+m.cls+'"><p>「'+m.q+'」</p><span class="mono">'+m.s+'</span>'
      +'<div class="lit-tags">'+m.tags.map(t=>'<span class="tag" style="border-color:currentColor;opacity:.8">'+t+'</span>').join('')+'</div></div>';
  }
  mc.appendChild(d);
});

/* ═══════════ 滚动显现（通用） ═══════════ */
$$(".chapter").forEach(ch=>{
  const h=ch.querySelector(".ch-head");
  gsap.from(h.querySelector(".ch-num"),{opacity:0,x:60,duration:1,ease:"power3.out",
    scrollTrigger:{trigger:h,start:"top 78%"}});
  gsap.from(h.querySelector(".ch-title"),{yPercent:60,opacity:0,duration:1,ease:"power4.out",
    scrollTrigger:{trigger:h,start:"top 78%"}});
  gsap.from([h.querySelector(".ch-meta"),h.querySelector(".ch-lede")].filter(Boolean),{opacity:0,y:20,stagger:.12,duration:.7,
    scrollTrigger:{trigger:h,start:"top 72%"}});
});
[["#litList .row-item"],["#formGroups .row-item"],["#artList .row-item"],["#socList .row-item"]].forEach(([sel])=>{
  ScrollTrigger.batch(sel,{start:"top 92%",once:true,
    onEnter:els=>gsap.fromTo(els,{opacity:0,y:44},{opacity:1,y:0,duration:.8,ease:"power3.out",stagger:.05})});
});
ScrollTrigger.batch(".m-item",{start:"top 94%",once:true,
  onEnter:els=>gsap.to(els,{opacity:1,y:0,duration:.9,ease:"power3.out",stagger:.08})});
$$(".fg-title").forEach(t=>gsap.from(t,{opacity:0,x:-40,duration:.8,ease:"power3.out",scrollTrigger:{trigger:t,start:"top 85%"}}));

/* ═══════════ 页脚：结束交互动画（田字归格） ═══════════ */
(function(){
  const g=$("#endGrid");
  const isTian=(r,c)=> r<2||r>9||c<2||c>9||((r===5||r===6)&&c>=2&&c<=9)||((c===5||c===6)&&r>=2&&r<=9);
  const hot=(r,c)=> (r===5||r===6)&&(c===5||c===6);
  for(let r=0;r<12;r++)for(let c=0;c<12;c++){
    const i=document.createElement("i");
    if(isTian(r,c)){i.classList.add("tian");if(hot(r,c))i.classList.add("hot");}
    g.appendChild(i);
  }
  const fTL=gsap.timeline({scrollTrigger:{trigger:"#end",start:"top top",end:"+=160%",pin:"#endPin",scrub:.6}});
  fTL.to("#endGrid i.tian",{opacity:1,ease:"none",stagger:{each:.012,from:"random"},duration:1})
     .to("#endGrid i:not(.tian)",{opacity:.3,duration:.4},"-=.3")
     .to("#endWord",{opacity:1,duration:.3})
     .from(".em-col",{opacity:0,y:24,stagger:.1,duration:.4},"-=.2")
     .from(".end-legal",{opacity:0,duration:.3});
})();
})();
