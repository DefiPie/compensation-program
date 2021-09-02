const eventsName = {
    AddedBlackList: 'AddedBlackList',
    RemovedBlackList: 'RemovedBlackList',
};

const revertMessages = {
    ownableCallerIsNotOwner: 'Ownable: caller is not the owner',
    serviceConstructorAddressIs0: 'Service::Constructor: address is 0',
    compensationConstructorAddressIs0: 'Compensation::Constructor: address is 0',
    compensationConstructorBlockNumIs0: 'Compensation::Constructor: block num is 0',
    compensationConstructorStartBlockIsMoreThanCurrentBlockAndMoreThanEndBlock: 'Compensation::Constructor: start block must be more than current block and less than end block',
    compensationCompensationYouCanConvertPTokensBeforeStartBlockOnly: 'Compensation::compensation: you can convert pTokens before start block only',
    compensationCompensationSumBorrowMustBeLessThan1: 'Compensation::compensation: sumBorrow must be less than $1',
    compensationRemoveUnusedBadTimingForRequest: 'Compensation::removeUnused: bad timing for the request',
    compensationClaimTokenUserInBlackList: 'Compensation::claimToken: user in black list',
    compensationClaimTokenBadTimingForRequest: 'Compensation::claimToken: bad timing for the request',
    convertConstructorAddressIs0: 'Convert::Constructor: address is 0',
    convertConstructorNumIs0: 'Convert::Constructor: num is 0',
    convertConstructorStartBlockIsMoreThanCurrentBlockAndMoreThanEndBlock: 'Convert::Constructor: start block must be more than current block and less than end block',
    convertRemoveUnusedTokenBadTimingForRequest: 'Convert::removeUnusedToken: bad timing for the request',
    convertAddCheckpointCurrentBlockValueMustBeLessThanFromBlockValue: 'Convert::addCheckpoint: current block value must be less than from block value',
    convertAddCheckpointStartBlockValueMustBeLessThanFromBlockValue: 'Convert::addCheckpoint: start block value must be less than from block value',
    convertAddCheckpointToBlockValueMustBeLessThanEndBlock: 'Convert::addCheckpoint: to block value must be less than end block',
    convertAddCheckpointBlockValueMustBeMoreThanPreviousLastBlockValue: 'Convert::addCheckpoint: block value must be more than previous last block value',
    convertAddCheckpointPercentValueMustBeMoreThan0: "Convert::addCheckpoint: percent value must be more than 0",
    convertAddCheckpointFromBlockValueMustBeLessThanToBlockValue: "Convert::addCheckpoint: to block value must be more than from block value",
    convertConvertIsNotOwner: 'Ownable: caller is not the owner',
    convertConvertYouCanConvertPTokensBeforeStartBlockOnly: 'Convert::convert: you can convert pTokens before first checkpoint block num only',
    convertConvertSumBorrowMustBeLessThan1: 'Convert::convert: sumBorrow must be less than $1',
    convertClaimTokenBadTimingForRequest: 'Convert::claimToken: bad timing for the request',
    convertClaimTokenUserInBlackList: 'Convert::claimToken: user in black list',
    refundConstructorBlockNumIs0: 'Refund::Constructor: block num is 0',
    refundConstructorStartBlockMustBeMoreThanCurrentBlockAndMoreThanEndBlock: 'Refund::Constructor: start block must be more than current block and less than end block',
    refundRemoveUnusedTokenBadTimingForRequest: 'Refund::removeUnused: bad timing for the request',
    refundRefundYouCanConvertPTokensBeforeStartBlockOnly: 'Refund::refund: you can convert pTokens before start block only',
    refundRefundSumBorrowMustBeLessThan1: 'Refund::refund: sumBorrow must be less than $1',
    refundClaimTokenBadTimingForRequest: 'Refund::claimToken: bad timing for the request',
    refundClaimTokenUserInBlackList: 'Refund::claimToken: user in black list',
};

module.exports = {
    eventsName,
    revertMessages,
};
