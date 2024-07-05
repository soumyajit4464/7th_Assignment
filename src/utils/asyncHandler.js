const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

//const asyncHandler=()=>{}
//const asyncHandler=(func)=>()=>{}
//const asyncHandler = (func) => async() => {}

export {asyncHandler}
