function validate(condition, errorMessage) {
    if (!condition) {
        throw errorMessage;
    }
}

module.exports = {
    validate
};
