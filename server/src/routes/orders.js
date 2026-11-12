import {Router} from 'express'
import {requireAuth} from '../middleware/auth.js'
import {Order} from '../models/index.js'
const router=Router()
router.use(requireAuth)
router.get('/mine',async(req,res,next)=>{try{res.json(await Order.find({customer:req.user.sub}).sort({createdAt:-1}).lean())}catch(e){next(e)}})
// Order creation is intentionally not exposed until stock reservation, pricing validation and payment verification are implemented.
export default router
