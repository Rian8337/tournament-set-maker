class Circle {
    /**
     * @param {Object} values An object containing the parameters.
     * @param {[number, number]} values.pos The position of the circle in `[x, y]` osupixels.
     */
    constructor(values) {
        /**
         * @type {[number, number]}
         * @description The position of the circle in `[x, y]` osupixels.
         */
        this.pos = values.pos || [0, 0]
    }

    /**
     * Returns a string representative of the class.
     *
     * @returns {string} The string representation of the class.
     */
    toString() {
        return `Position: [${this.pos[0]}, ${this.pos[1]}]`
    }
}

module.exports = Circle;