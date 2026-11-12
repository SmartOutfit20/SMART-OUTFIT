import {Router} from 'express'
import {Setting} from '../models/index.js'
const router=Router()
router.get('/',async(req,res,next)=>{try{const rows=await Setting.find({key:{$in:['deliveryCharge','storeName','supportEmail','supportPhone','storeNotice','defaultLanguage']}}).lean();const values=Object.fromEntries(rows.map(x=>[x.key,x.value]));res.json({storeName:values.storeName||'SMART OUTFIT',deliveryCharge:Number(values.deliveryCharge??process.env.DELIVERY_CHARGE_BDT??100),supportEmail:values.supportEmail||'',supportPhone:values.supportPhone||'',storeNotice:values.storeNotice||'',defaultLanguage:values.defaultLanguage||'en'})}catch(e){next(e)}})
export default router
