import { SmartConveyorChaincode } from './SmartConveyorChaincode';
import { StubHelper } from './StubHelper';
import { ChaincodeError } from './ChaincodeError';
import { Transform } from './utils/datatransform';
import { Helpers } from './utils/helpers';
import { ConveyorItemType } from './ConveyorItemType';
import shim = require('fabric-shim');

export {
    SmartConveyorChaincode,
    StubHelper,
    ChaincodeError,
    Transform,
    Helpers,
    ConveyorItemType
}

export interface KV {
    key: string;
    value: any;
}

shim.start(new SmartConveyorChaincode('debug'));