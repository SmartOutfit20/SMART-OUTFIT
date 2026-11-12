import jwt from 'jsonwebtoken'
import {User} from '../models/index.js'

export async function requireAuth(req,res,next){
 const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null
 if(!token)return res.status(401).json({message:'Authentication required'})
 let decoded
 try{decoded=jwt.verify(token,process.env.JWT_SECRET)}catch{return res.status(401).json({message:'Invalid or expired token'})}
 try{
  // Read the current role from MongoDB on every authenticated request.
  // This prevents stale JWT role claims after an admin changes a user's role.
  const user=await User.findById(decoded.sub).select('role isActive').lean()
  if(!user||!user.isActive)return res.status(401).json({message:'Account is unavailable. Please sign in again.'})
  req.user={...decoded,role:user.role}
  next()
 }catch(error){next(error)}
}
export const requireRole=(...roles)=>(req,res,next)=>{
 if(!req.user||!roles.includes(req.user.role))return res.status(403).json({message:'Insufficient permissions'})
 next()
}
