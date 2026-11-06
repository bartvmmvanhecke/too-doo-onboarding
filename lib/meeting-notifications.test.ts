import { describe, expect, it } from "vitest";
import { reminderContent, startNotification } from "./meeting-notifications";
import { newBlock, newItem } from "./agenda";
import type { Meeting } from "./store";
const m:Meeting={id:"m",name:"Directie",type:"Algemeen",date:"2026-11-06",time:540,duration:60,recurrence:"weekly",participants:["jp"],blocks:[newBlock("topics",{items:[newItem("Punt") ]})],actions:[],held:false,invited:true,showWelcome:false};
describe("herinneringsinhoud",()=>{
 it("vraagt of een niet gestarte vergadering is doorgegaan en linkt naar het gewone detail",()=>{
  const content=reminderContent(m,new Date("2026-11-06T12:00:00").getTime());expect(content.question).toBe(true);expect(content.subject).toBe("Is Directie doorgegaan?");expect(content.yesHref).toContain("doorgegaan=ja");
 });
 it("geeft de variant Nog één klik na openen van de afrondstap",()=>{
  const content=reminderContent({...m,startedAt:1,lastActivityAt:1000,wrapUpOpen:true});expect(content.subject).toBe("Nog één klik");expect(content.href).toBe("/vergaderingen/m#afronden");
 });
 it("maakt een startmelding zonder te verzenden",()=>{expect(startNotification(m)).toMatchObject({subject:"Directie begint nu",agendaCount:1,openActions:0});});
});
