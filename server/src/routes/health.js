import {Router} from 'express'
import mongoose from 'mongoose'
const router=Router()
router.get('/',(req,res)=>res.json({service:'SMART OUTFIT API',status:'ok',database:mongoose.connection.readyState===1?'connected':'not_connected',timestamp:new Date().toISOString()}))
export default router
