// World axes are shared by the chair and the seated body. Local v is forward
// from the backrest; u is the person's right. All heights are world pixels.
export const project=(x,y,z=0)=>({x:(x-y)*36,y:(x+y)*18-z});
export const unproject=(x,y)=>({x:x/72+y/36,y:y/36-x/72});
export const SEAT_HEIGHT=13;
export function seatFrame(rotation=0){
 const index=((rotation%4)+4)%4,forward=[[0,-1],[1,0],[0,1],[-1,0]][index],right=[-forward[1],forward[0]];
 const world=(u,v,z)=>({x:right[0]*u+forward[0]*v,y:right[1]*u+forward[1]*v,z});
 return {rotation:index,forward,right,direction:['north','east','south','west'][index],backEdge:(index+2)%4,backNear:index===0||index===3,headMirror:index<2?1:-1,world,point:(u,v,z)=>{const p=world(u,v,z);return project(p.x,p.y,p.z);}};
}
