import {Router} from 'express'
import {requireAuth,requireRole} from '../middleware/auth.js'
import {Coupon,ActivityLog} from '../models/index.js'
const router=Router()
router.use(requireAuth,requireRole('super_admin','admin','editor'))
router.get('/',async(req,res,next)=>{try{res.json(await Coupon.find().sort({createdAt:-1}).lean())}catch(e){next(e)}})
router.post('/',async(req,res,next)=>{try{
 const code=String(req.body.code||'').trim().toUpperCase(),type=req.body.type==='fixed'?'fixed':'percentage',value=Number(req.body.value),minimumOrder=Number(req.body.minimumOrder||0),usageLimit=req.body.usageLimit===''||req.body.usageLimit==null?undefined:Number(req.body.usageLimit)
 if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!Number.isFinite(value)||value<=0||(type==='percentage'&&value>100)||!Number.isFinite(minimumOrder)||minimumOrder<0||(usageLimit!==undefined&&(!Number.isInteger(usageLimit)||usageLimit<1)))return res.status(400).json({message:'Check coupon code, discount, minimum order and usage limit.'})
 const coupon=await Coupon.create({code,type,value,minimumOrder,usageLimit,expiresAt:req.body.expiresAt||undefined,isActive:req.body.isActive!==false})
 ActivityLog.create({actor:req.user.sub,action:'coupon.created',resource:'coupon',resourceId:coupon._id.toString(),ip:String(req.ip||'').slice(0,80),metadata:{code:coupon.code,type:coupon.type,value:coupon.value}}).catch(()=>{})
 res.status(201).json(coupon)
 }catch(e){next(e)}})
router.patch('/:id',async(req,res,next)=>{try{
 const allowed=['code','type','value','minimumOrder','usageLimit','expiresAt','isActive'],update={}
 for(const k of allowed)if(req.body[k]!==undefined)update[k]=req.body[k]
 if(update.code)update.code=String(update.code).trim().toUpperCase()
 if(update.type&&!['fixed','percentage'].includes(update.type))return res.status(400).json({message:'Invalid discount type'})
 const coupon=await Coupon.findByIdAndUpdate(req.params.id,{$set:update},{new:true,runValidators:true})
 if(!coupon)return res.status(404).json({message:'Coupon not found'})
 ActivityLog.create({actor:req.user.sub,action:'coupon.updated',resource:'coupon',resourceId:coupon._id.toString(),ip:String(req.ip||'').slice(0,80),metadata:{code:coupon.code}}).catch(()=>{})
 res.json(coupon)
 }catch(e){next(e)}})
router.delete('/:id',async(req,res,next)=>{try{const coupon=await Coupon.findByIdAndDelete(req.params.id);if(!coupon)return res.status(404).json({message:'Coupon not found'});ActivityLog.create({actor:req.user.sub,action:'coupon.deleted',resource:'coupon',resourceId:coupon._id.toString(),ip:String(req.ip||'').slice(0,80),metadata:{code:coupon.code}}).catch(()=>{});res.json({message:'Coupon deleted'})}catch(e){next(e)}})
export default router
