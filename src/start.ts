import shim = require('fabric-shim');
import { SmartConveyorChaincode } from '.';

shim.start(new SmartConveyorChaincode('debug'));