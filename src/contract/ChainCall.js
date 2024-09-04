
const contract_call = async (web3, collectAddress, collectAbi, funName, funParam) => {


}
const contract_static_call = async (ethers, collectAddress, collectAbi, funName, customHttpProvider, funParam) => {
    try {
        let contract = new ethers.Contract(
            collectAddress,
            collectAbi,
            customHttpProvider
        );

        let result = await contract[funName](
            ...funParam
        );
        return {
            err: null,
            data: result
        };
    } catch (err) {
        console.trace(err)
        return {err: err, data: null}

    }

}
module.exports = {
    contract_call,
    contract_static_call
};
