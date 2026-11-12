import {Router} from 'express'
import {createHash} from 'node:crypto'
import {VisitorDaily} from '../models/index.js'
const router=Router()
router.post('/visit',async(req,res,next)=>{try{
 const visitorId=String(req.body.visitorId||'').slice(0,120)
 const pagePath=String(req.body.path||'/').slice(0,240)
 if(!/^[a-zA-Z0-9._-]{12,120}$/.test(visitorId))return res.status(400).json({message:'Invalid visitor identifier'})
 const visitorHash=createHash('sha256').update(visitorId).digest('hex')
 const now=new Date(),day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))
 await VisitorDaily.updateOne({visitorHash,day},{$inc:{pageViews:1},$set:{lastSeenAt:now,lastPath:pagePath},$setOnInsert:{visitorHash,day,firstSeenAt:now}},{upsert:true})
 res.status(202).json({ok:true})
 }catch(e){next(e)}})
export default router
