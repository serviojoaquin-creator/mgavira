import { useMemo } from 'react'
import { BoxInstances } from './ModernCity'
import { atRoad, cityIntersections, routeLength } from '../experience/route'

type Block = { position: [number,number,number]; size: [number,number,number]; yaw: number; color?: string }
export function CityStreetDetails() {
  const parts=useMemo(() => {
    const wood: Block[]=[],metal: Block[]=[],stone: Block[]=[]
    const place=(list: Block[],t:number,offset:number,x:number,y:number,z:number,size:Block['size'],color?:string) => {
      const {point,tangent,side}=atRoad(t,offset)
      list.push({position:[point.x+tangent.x*x+side.x*z,y,point.z+tangent.z*x+side.z*z],size,yaw:Math.atan2(-tangent.z,tangent.x),color})
    }
    for(const t of [.18,.50,.86]) {
      for(let slat=0;slat<5;slat++) {
        place(wood,t,-8.2,0,.61,(slat-2)*.09,[1.8,.055,.073])
        place(wood,t,-8.2,0,.81+slat*.085,-.27,[1.8,.062,.055])
      }
      for(const x of [-.66,.66]) {
        place(metal,t,-8.2,x,.34,0,[.065,.54,.46])
        place(metal,t,-8.2,x,.79,-.25,[.065,.72,.055])
      }
      place(metal,t,-8.2,1.55,.58,0,[.48,.85,.48],'#485149')
      place(stone,t,-8.2,1.55,1.01,0,[.51,.06,.51],'#64685e')
    }
    for(let distance=8;distance<routeLength-5;distance+=14) {
      const t=distance/routeLength
      if(cityIntersections.some(c=>Math.abs(c-t)*routeLength<7)) continue
      for(const s of [-1,1]) {
        place(metal,t,s*4.43,0,.031,0,[.57,.014,.32],'#373b38')
        for(let bar=0;bar<7;bar++) place(stone,t,s*4.43,-.24+bar*.08,.043,0,[.022,.016,.30],'#73756c')
      }
    }
    for(const t of cityIntersections) for(const s of [-1,1]) for(const x of [-7.9,7.9]) {
      place(metal,t,s*5.1,x,.58,0,[.10,.88,.10],'#414b46')
      place(stone,t,s*5.1,x,.88,0,[.105,.075,.105],'#c6c3af')
    }
    return {wood,metal,stone}
  },[])
  return <group>
    <BoxInstances blocks={parts.wood} color="#82715a" roughness={.82} />
    <BoxInstances blocks={parts.metal} color="#a0a49c" roughness={.53} metalness={.55} />
    <BoxInstances blocks={parts.stone} color="#d0cbb9" roughness={.85} />
  </group>
}
