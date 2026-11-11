/** Local calendar only; no invented personal birthdays or external holiday feeds. */
export const AMBIENT_OCCASIONS=[{id:'christmas',name:'Advent & Weihnachten'},{id:'nicholas',name:'Nikolaus'},{id:'newyear',name:'Silvester & Neujahr'},{id:'valentine',name:'Valentinstag'},{id:'easter',name:'Ostern'},{id:'mothersday',name:'Muttertag'},{id:'fathersday',name:'Vatertag / Himmelfahrt'},{id:'pentecost',name:'Pfingsten'},{id:'unityday',name:'Tag der Deutschen Einheit'},{id:'halloween',name:'Halloween'}];
const DAY=86400000;
export function easterSunday(year){const a=year%19,b=Math.floor(year/100),c=year%100,h=(19*a+b-Math.floor(b/4)-Math.floor((b-Math.floor((b+8)/25)+1)/3)+15)%30,l=(32+2*(b%4)+2*Math.floor(c/4)-h-c%4)%7,m=Math.floor((a+11*h+22*l)/451),v=h+l-7*m+114;return Date.UTC(year,Math.floor(v/31)-1,v%31+1);}
export function ambientCalendar(now,zone='Europe/Berlin'){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',hourCycle:'h23'}).formatToParts(now),get=k=>Number(parts.find(p=>p.type===k)?.value),year=get('year'),month=get('month'),day=get('day'),hour=get('hour'),date=Date.UTC(year,month-1,day),easter=easterSunday(year),may1=Date.UTC(year,4,1),mother=may1+((7-new Date(may1).getUTCDay())%7+7)*DAY,nov27=Date.UTC(year,10,27),advent=nov27+(7-new Date(nov27).getUTCDay())%7*DAY;
 const occasions=[];
 if(month===12&&day===31||month===1&&day===1)occasions.push('newyear');
 if(month===12&&(day===5||day===6))occasions.push('nicholas');
 if(month===2&&day===14)occasions.push('valentine');
 if(date===mother)occasions.push('mothersday');
 if(date===easter+39*DAY)occasions.push('fathersday');
 if(date===easter+49*DAY||date===easter+50*DAY)occasions.push('pentecost');
 if(month===10&&day===3)occasions.push('unityday');
 if(month===10&&day>=20||month===11&&day===1)occasions.push('halloween');
 if(Math.abs(date-easter)<=7*DAY)occasions.push('easter');
 if((month===11||month===12)&&date>=advent||month===1&&day<=6)occasions.push('christmas');
 return {year,month,day,hour,season:month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter',occasions};
}
