/* Local SVG storyboards. Timing lives in main.js; this renderer has no timers or storage. */
(() => {
  'use strict';
  const descriptions={
    pepe:['Pepe đang xem laptop ở nhà.','Laptop nhận tin nhắn: E rảnh ko?','Pepe cau có, nổi giận.','Pepe đập laptop xuống đất bên trái.','Pepe đập laptop xuống đất bên phải.','Pepe tiếp tục đập laptop từ bên này sang bên kia.','Pepe quăng laptop đi.','Pepe tỉnh bơ. Không thấy, không biết.'],
    capybara:['Capybara nằm đắp chăn, lướt điện thoại.','Điện thoại báo tin nhắn: E rảnh ko?','Capybara mở to mắt, sợ hãi.','Capybara quăng điện thoại ra xa.','Capybara trùm kín chăn.','Capybara tắt đèn.','Capybara ngủ trong bóng tối.','Capybara đã ngủ. Tin nhắn để mai.'],
    cat:['Mèo cam ngồi xem điện thoại.','Điện thoại báo tin nhắn: E rảnh ko?','Mèo cam nhìn tin nhắn, cau mày.','Mèo cam đặt điện thoại xuống đất.','Mèo cam hét thật to vào điện thoại: Meowww!','Meowww!','Mèo cam đã trả lời xong.','Mèo cam đã trả lời xong.']
  };
  function room(character){return `<rect width="700" height="400" fill="#eee4cf"/><path d="M0 308h700v92H0Z" fill="#d8c6a4"/><path d="M0 308h700" stroke="#bca787" stroke-width="3"/><rect x="50" y="36" width="140" height="170" rx="8" fill="#6a8284" stroke="#8f977e" stroke-width="6"/><path d="M120 38v165M53 122h135" stroke="#9ba58e" stroke-width="4"/><circle cx="151" cy="76" r="18" fill="#f6e5a8"/><circle cx="142" cy="70" r="18" fill="#6a8284"/><g fill="#e7ddbc"><circle cx="77" cy="65" r="2"/><circle cx="166" cy="160" r="2"/><circle cx="86" cy="146" r="2"/></g><g stroke="#8c8165" stroke-width="3" fill="none"><path d="M567 274v-145m-32 145h64"/><path d="M537 112h60l20 42h-100Z" fill="#f4d793"/><path d="M596 156v35"/></g><ellipse cx="350" cy="358" rx="180" ry="23" fill="#c6b392"/><text x="350" y="48" text-anchor="middle" fill="#8b8068" font-family="Arial" font-size="12" letter-spacing="3">${character==='capybara'?'GIỜ ĐI NGỦ CỦA CAPYBARA':'Ở NHÀ · NGOÀI GIỜ LÀM VIỆC'}</text>`;}
  function phone(x,y,rotation=0){return `<g transform="translate(${x} ${y}) rotate(${rotation})"><rect x="-15" y="-25" width="30" height="51" rx="6" fill="#586a63" stroke="#354438" stroke-width="3"/><rect x="-10" y="-18" width="20" height="34" rx="2" fill="#cce0ce"/><path d="M-6-8H6m-12 7H3m-9 7H6" stroke="#80a48c" stroke-width="2"/><circle cy="21" r="2" fill="#d1d9bf"/></g>`;}
  function laptop(){return '<g class="line"><path d="M-57-43h114v66H-57Z" fill="#87a49b"/><path d="M-49-35h98v50h-98Z" fill="#dbe7cd"/><path d="M-57 23l-18 13H75L57 23Z" fill="#a7b5a0"/><path d="M-37-19h60m-60 10H5" stroke="#8caa92" stroke-width="3"/></g>';}
  function message(stage){return stage>=1&&stage<=3?`<g class="message-bubble"><path d="M405 72h175q15 0 15 15v42q0 15-15 15H445l-29 25l6-25h-17q-15 0-15-15V87q0-15 15-15Z" fill="#fffaf0" stroke="#df754d" stroke-width="3"/><circle cx="416" cy="96" r="6" fill="#ed7549"/><text x="435" y="100" font-family="Arial" font-size="10" fill="#a78467">New message</text><text x="412" y="127" font-family="Arial" font-size="21" font-weight="700" fill="#3a4637">Sếp: E rảnh ko?</text></g>`:'';}
  function expression(character,kind,face){
    let svg=face(character,0,false,false,kind==='angry');
    if(kind==='scared')svg+= '<g class="line"><ellipse cx="-24" cy="-16" rx="14" ry="20" fill="#fff8e2"/><ellipse cx="24" cy="-16" rx="14" ry="20" fill="#fff8e2"/><circle cx="-24" cy="-12" r="4" fill="#334533"/><circle cx="24" cy="-12" r="4" fill="#334533"/><ellipse cy="19" rx="11" ry="13" fill="#6f4d3c"/><path d="M-38-43l21-6m14 0l21 6" fill="none"/><path d="M56-18q-11 16 0 16q11 0 0-16" fill="#a6cbd5" stroke-width="2"/></g>';
    if(kind==='shouting')svg+='<g class="line"><ellipse cy="18" rx="25" ry="28" fill="#754b3b"/><path d="M-14 36q14-15 28 0" fill="none" stroke="#e59a87" stroke-width="8"/><path d="M-38-28l26 8m24 0l26-8" fill="none" stroke-width="5"/></g>';
    if(kind==='angry')svg+='<path d="M43-48v15m-7-8h15m-1-7v15" fill="none" stroke="#da6347" stroke-width="4"/>';
    return svg;
  }
  function pepe(stage,face){
    const angry=stage>=2&&stage<=6;
    const positions=[[374,283,0],[374,283,0],[379,260,-13],[229,332,-31],[475,332,28],[225,333,-33],[435,220,20]];
    const [x,y,angle]=positions[Math.min(stage,6)];
    const smash=stage>=3&&stage<=5;
    const limb=window.PaidToWaitWork.limb;
    const shoulder=angry?[308,237]:[382,236];
    return `<g class="line">${limb([[321,270],[304,303],[286,337]],'#718581','#718581',{width:29,leg:true})}${limb([[367,270],[386,303],[407,337]],'#718581','#718581',{width:29,leg:true})}<path d="M302 213q46-19 85 3l-5 66h-80Z" fill="#7191a1"/><path d="M310 279h63" stroke="#536f73" stroke-width="2"/><g transform="translate(345 186)">${expression('pepe',angry?'angry':'neutral',face)}</g><g class="${smash?'smashing-arm':''}">${limb([shoulder,[(shoulder[0]+x)/2,(shoulder[1]+y-12)/2-15],[x,y-12]],'#7191a1','#8eae62',{width:24})}</g></g>
      ${stage<7?`<g transform="translate(${x} ${y}) rotate(${angle})"><g class="${stage===6?'laptop-toss':smash?'laptop-smash':''}">${laptop()}</g></g>`:''}
      ${smash?`<g class="impact-burst" fill="#f6ce72" stroke="#c97544" stroke-width="3"><path d="M${x-48} 351l22-13l-12-21l29 14l12-24l10 25l29-10l-15 22l28 9Z"/><text x="${x}" y="382" text-anchor="middle" fill="#b15e3d" stroke="none" font-size="24" font-weight="900">RẦM!</text></g>`:''}
      ${stage===7?window.PaidToWaitWork.bubble('Tin nhắn nào cơ?',190,55,320,25):''}`;
  }
  function capybara(stage,face){
    return `<g class="line"><rect x="218" y="263" width="289" height="79" rx="17" fill="#b79978"/><path d="M239 340v20m248-20v20" stroke="#8d775d" stroke-width="7"/><rect x="228" y="232" width="128" height="63" rx="20" fill="#f5efd9"/>
      ${stage<4?`<g transform="translate(297 237) rotate(-13)">${expression('capybara',stage>=2?'scared':'neutral',face)}</g>`:''}
      <path class="blanket" d="M${stage>=4?'227 195q55-74 119 35':'333 250q25-26 65-10'}q76-12 94 56v41H228v-49Z" fill="#8ba698"/><path d="M350 265l20 47m30-51l18 51m34-39l15 41" fill="none" stroke="#aec2a9" stroke-width="3"/>
      ${stage<3?`${window.PaidToWaitWork.limb([[342,263],[356,234],[377,210]],'#b3c3b6','#bfa17b',{width:23})}${phone(381,205,-12)}`:stage===3?`<g class="phone-toss">${phone(397,207,20)}</g>`:''}</g>
      ${stage>=2&&stage<4?'<g class="panic-lines" fill="none" stroke="#d98757" stroke-width="4"><path d="M213 168l-14-12m18 28h-22m149-32l12-15"/></g>':''}
      ${stage>=5?'<rect class="lights-out" width="700" height="400" fill="#1e2b36" fill-opacity=".87"/><g fill="#f5e8b5" font-family="Arial"><text class="sleep-z" x="298" y="190" font-size="35">Z<tspan dy="-20" font-size="24">z</tspan><tspan dy="-15" font-size="16">z</tspan></text><text x="350" y="367" text-anchor="middle" font-size="15">Đã ngủ. Không rảnh.</text></g>':''}`;
  }
  function cat(stage,face){
    const shouting=stage===4||stage===5;
    const limb=window.PaidToWaitWork.limb;
    return `<g class="line"><rect x="285" y="284" width="122" height="35" rx="13" fill="#ba9b79"/><path d="M300 318v33m91-33v33" stroke="#947959" stroke-width="7"/>${limb([[329,277],[stage<4?309:319,303],[stage<4?337:311,337]],'#718581','#718581',{width:27,leg:true})}${limb([[374,277],[385,303],[391,337]],'#718581','#718581',{width:27,leg:true})}<path d="M315 219q32-18 66 0l12 65h-89Z" fill="#c88458"/><path d="M313 282h71" stroke="#966443" stroke-width="2"/><path d="M393 284q58 17 45-20q-5-13-15-9" fill="none" stroke="#d58c3b" stroke-width="15"/>
      <g transform="translate(347 ${shouting?229:190}) rotate(${shouting?26:0})">${expression('cat',shouting?'shouting':stage>=2&&stage<4?'angry':'neutral',face)}</g>
      ${limb([[381,240],[stage===3?408:391,stage<3?251:276],stage<3?[404,259]:stage===3?[424,329]:[405,294]],'#c88458','#e8a04c',{width:23})}
      ${stage<3?phone(410,252,-9):phone(431,345,90)}</g>
      ${shouting?'<g class="meow-bubble"><path d="M194 65l43 8l13-20l30 17l26-22l26 21l30-18l23 19l35-14l17 22l43-8l-5 25l35 14l-23 22l9 24l-37-1l-27 19l-17-17l-36 10l-22-15l-35 13l-15-19l-42 10l-1-21l-41-2l13-25Z" fill="#fff4bf" stroke="#54462f" stroke-width="4"/><path d="M390 160l35 133l-64-122" fill="#fff4bf" stroke="#54462f" stroke-width="3"/><text x="348" y="130" text-anchor="middle" font-family="Arial" font-weight="900" font-style="italic" font-size="49" fill="#d95731" stroke="#7d3d27" stroke-width="1">Meowww!</text></g><g class="shout-rays" stroke="#d98757" stroke-width="4"><path d="M404 278l20 27m-9-34l24 16m-44 1l10 24"/></g>':''}
      ${stage>=6?'<text x="350" y="91" text-anchor="middle" fill="#856c4f" font-size="19">Đã trả lời. Rất rõ ràng.</text>':''}`;
  }
  window.PaidToWaitReactions=Object.freeze({
    describe:(character,stage)=>descriptions[character][stage],
    render:(character,stage,face)=>`<g class="after-hours-story" data-character="${character}" data-stage="${stage}" font-family="Arial">${room(character)}${character==='pepe'?pepe(stage,face):character==='capybara'?capybara(stage,face):cat(stage,face)}${message(stage)}</g>`
  });
})();
