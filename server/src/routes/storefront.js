import {Router} from 'express'
import {Setting,Category} from '../models/index.js'
const router=Router()
async function sendBrandIcon(req,res,next,primaryKey){
 try{
  const [primary,fallback]=await Promise.all([Setting.findOne({key:primaryKey}).lean(),Setting.findOne({key:'storeLogo'}).lean()]);
  const value=String(primary?.value||fallback?.value||'');
  const match=value.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
  if(!match)return res.status(404).end();
  res.set({'Content-Type':'image/webp','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff'});
  res.send(Buffer.from(match[1],'base64'));
 }catch(e){next(e)}
}
router.get('/icon',(req,res,next)=>sendBrandIcon(req,res,next,'faviconLogo'));
router.get('/app-icon',(req,res,next)=>sendBrandIcon(req,res,next,'appLogo'));
router.get('/manifest.webmanifest',async(req,res,next)=>{
 try{
  const [appLogo,storeLogo,storeName,tagline]=await Promise.all(['appLogo','storeLogo','storeName','tagline'].map(key=>Setting.findOne({key}).lean()));
  const hasLogo=/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(String(appLogo?.value||storeLogo?.value||''));
  const name=String(storeName?.value||'SMART OUTFIT').slice(0,100);
  const iconUrl='/api/storefront/app-icon?v='+Date.now();const manifest={id:'/',name,short_name:name.slice(0,24),description:String(tagline?.value||'Your Style, Our Inspiration.').slice(0,180),start_url:'/',scope:'/',display:'standalone',background_color:'#ffffff',theme_color:'#21113c',orientation:'portrait',icons:hasLogo?[{src:iconUrl,sizes:'192x192',type:'image/webp',purpose:'any'},{src:iconUrl,sizes:'512x512',type:'image/webp',purpose:'any maskable'}]:[]};
  res.set({'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate','Pragma':'no-cache','Expires':'0'});
  res.json(manifest);
 }catch(e){next(e)}
});
router.get('/',async(req,res,next)=>{try{const keys=['homepageBanners','navigationMenu','storeLogo','deliveryCharge','freeShippingThreshold','storeName','tagline','supportEmail','supportPhone','whatsappNumber','storeAddress','storeNotice','defaultLanguage','announcementEnabled','maintenanceMode','returnPolicy','shippingPolicy','aboutText','facebookUrl','instagramUrl','youtubeUrl','tiktokUrl','advancePaymentEnabled','bkashNumber','bkashAccountName','bkashInstructions','nagadNumber','nagadAccountName','nagadInstructions'];const [rows,categories]=await Promise.all([Setting.find({key:{$in:keys}}).lean(),Category.find({isActive:true}).sort({sortOrder:1,name:1}).select('name slug sortOrder').lean()]);const values=Object.fromEntries(rows.map(x=>[x.key,x.value]));res.json({categories,homepageBanners:Array.isArray(values.homepageBanners)?values.homepageBanners:[],navigationMenu:Array.isArray(values.navigationMenu)?values.navigationMenu:[],storeLogo:values.storeLogo||'',storeName:values.storeName||'SMART OUTFIT',tagline:values.tagline||'Your Style, Our Inspiration.',deliveryCharge:Number(values.deliveryCharge??process.env.DELIVERY_CHARGE_BDT??100),freeShippingThreshold:Number(values.freeShippingThreshold??3000),supportEmail:values.supportEmail||'',supportPhone:values.supportPhone||'',whatsappNumber:values.whatsappNumber||'',storeAddress:values.storeAddress||'',storeNotice:values.storeNotice||'',defaultLanguage:values.defaultLanguage||'en',announcementEnabled:values.announcementEnabled!==false,maintenanceMode:!!values.maintenanceMode,returnPolicy:values.returnPolicy||'',shippingPolicy:values.shippingPolicy||'',aboutText:values.aboutText||'',facebookUrl:values.facebookUrl||'',instagramUrl:values.instagramUrl||'',youtubeUrl:values.youtubeUrl||'',tiktokUrl:values.tiktokUrl||'',advancePaymentEnabled:values.advancePaymentEnabled!==false,bkashNumber:values.bkashNumber||'',bkashAccountName:values.bkashAccountName||'',bkashInstructions:values.bkashInstructions||'',nagadNumber:values.nagadNumber||'',nagadAccountName:values.nagadAccountName||'',nagadInstructions:values.nagadInstructions||''})}catch(e){next(e)}})
export default router
