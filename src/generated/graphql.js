"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTransferSuspenseQuery = exports.useTransferLazyQuery = exports.useTransferQuery = exports.TransferDocument = exports.TransferFieldsFragmentDoc = exports._SubgraphErrorPolicy_ = exports.Transfer_OrderBy = exports.OrderDirection = exports.Aggregation_Interval = void 0;
var client_1 = require("@apollo/client");
var Apollo = require("@apollo/client");
var defaultOptions = {};
var Aggregation_Interval;
(function (Aggregation_Interval) {
    Aggregation_Interval["Day"] = "day";
    Aggregation_Interval["Hour"] = "hour";
})(Aggregation_Interval || (exports.Aggregation_Interval = Aggregation_Interval = {}));
/** Defines the order direction, either ascending or descending */
var OrderDirection;
(function (OrderDirection) {
    OrderDirection["Asc"] = "asc";
    OrderDirection["Desc"] = "desc";
})(OrderDirection || (exports.OrderDirection = OrderDirection = {}));
var Transfer_OrderBy;
(function (Transfer_OrderBy) {
    Transfer_OrderBy["AssetClass"] = "assetClass";
    Transfer_OrderBy["BlockNumber"] = "blockNumber";
    Transfer_OrderBy["BlockTimestamp"] = "blockTimestamp";
    Transfer_OrderBy["From"] = "from";
    Transfer_OrderBy["Id"] = "id";
    Transfer_OrderBy["OrderId"] = "orderId";
    Transfer_OrderBy["To"] = "to";
    Transfer_OrderBy["Token"] = "token";
    Transfer_OrderBy["TokenId"] = "tokenId";
    Transfer_OrderBy["TransactionHash"] = "transactionHash";
    Transfer_OrderBy["TransferDirection"] = "transferDirection";
    Transfer_OrderBy["TransferType"] = "transferType";
    Transfer_OrderBy["Value"] = "value";
})(Transfer_OrderBy || (exports.Transfer_OrderBy = Transfer_OrderBy = {}));
var _SubgraphErrorPolicy_;
(function (_SubgraphErrorPolicy_) {
    /** Data will be returned even if the subgraph has indexing errors */
    _SubgraphErrorPolicy_["Allow"] = "allow";
    /** If the subgraph has indexing errors, data will be omitted. The default. */
    _SubgraphErrorPolicy_["Deny"] = "deny";
})(_SubgraphErrorPolicy_ || (exports._SubgraphErrorPolicy_ = _SubgraphErrorPolicy_ = {}));
exports.TransferFieldsFragmentDoc = (0, client_1.gql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    fragment TransferFields on Transfer {\n  id\n  from\n  to\n  value\n  tokenId\n  transactionHash\n  token\n  blockNumber\n  blockTimestamp\n}\n    "], ["\n    fragment TransferFields on Transfer {\n  id\n  from\n  to\n  value\n  tokenId\n  transactionHash\n  token\n  blockNumber\n  blockTimestamp\n}\n    "])));
exports.TransferDocument = (0, client_1.gql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n    query Transfer($id: BigInt!) {\n  transfers(where: {orderId: $id}) {\n    ...TransferFields\n  }\n}\n    ", ""], ["\n    query Transfer($id: BigInt!) {\n  transfers(where: {orderId: $id}) {\n    ...TransferFields\n  }\n}\n    ", ""])), exports.TransferFieldsFragmentDoc);
/**
 * __useTransferQuery__
 *
 * To run a query within a React component, call `useTransferQuery` and pass it any options that fit your needs.
 * When your component renders, `useTransferQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTransferQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
function useTransferQuery(baseOptions) {
    var options = __assign(__assign({}, defaultOptions), baseOptions);
    return Apollo.useQuery(exports.TransferDocument, options);
}
exports.useTransferQuery = useTransferQuery;
function useTransferLazyQuery(baseOptions) {
    var options = __assign(__assign({}, defaultOptions), baseOptions);
    return Apollo.useLazyQuery(exports.TransferDocument, options);
}
exports.useTransferLazyQuery = useTransferLazyQuery;
function useTransferSuspenseQuery(baseOptions) {
    var options = baseOptions === Apollo.skipToken ? baseOptions : __assign(__assign({}, defaultOptions), baseOptions);
    return Apollo.useSuspenseQuery(exports.TransferDocument, options);
}
exports.useTransferSuspenseQuery = useTransferSuspenseQuery;
var templateObject_1, templateObject_2;
