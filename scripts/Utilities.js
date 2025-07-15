class Utilities {
    /**
     * @param {PIXIObject} pixiObj
     * @param {{type: fromTo,alpha: targetValue, time: effectLastingTime, ease: easingType}} effectValue
     **/

    //参看chunkjs 496636: (e, t, n) app-e068da2c7784d39c21c6.js

    static fadingEffect(pixiObj, effectValue, isFastForward) {
        const thisEffect = this._getFromTo(effectValue.type);
        //delete effectValue.type;
        //虽然会引发警告 但清理type会导致spine坐标系漂移？

        if (effectValue?.time) {
            effectValue.duration = effectValue.time / 1000;
            delete effectValue.time;
        }
        if (isFastForward) {
            effectValue.duration = 50 / 1000;
        }
        if (!effectValue?.ease) {
            effectValue.ease = "easeInOutQuad";
        } else {
            effectValue.ease = this._getEasing(effectValue.ease);
        }
        // thisEffect(pixiObj, effectValue);

        ///修改标记 适配effectValue中的scale
        if (effectValue.scale) {
            const scaleValue = effectValue.scale;
            const effectValueCopy = { ...effectValue };
            delete effectValueCopy.scale;
            effectValueCopy.pixi = { scaleX: scaleValue, scaleY: scaleValue };

            thisEffect(pixiObj, effectValueCopy);
        } else {
            thisEffect(pixiObj, effectValue);
        }
        //
    }

    static _getFromTo(fromto) {
        switch (fromto) {
            case "from":
                return TweenMax.from;
            case "to":
                return TweenMax.to;
        }
    }

    static _getEasing(easing) {
        switch (easing) {
            case "easeInOutQuad":
                return Quad.easeInOut;
            case "easeInQuad":
                return Quad.easeIn;
            case "easeOutQuad":
                return Quad.easeOut;
            case "none":
                return Power0.easeNone;
            default:
                return Quad.easeInOut;
        }
    }
}
