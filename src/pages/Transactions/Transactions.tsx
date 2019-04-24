import {
    faAngleDoubleLeft,
    faAngleDoubleRight,
    faAngleLeft,
    faAngleRight,
    faSpinner
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as _ from "lodash";
import * as React from "react";
import { Redirect } from "react-router";
import { Container } from "reactstrap";

import { TransactionDoc } from "codechain-indexer-types";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import Col from "reactstrap/lib/Col";
import Row from "reactstrap/lib/Row";
import { CommaNumberString } from "src/components/util/CommaNumberString/CommaNumberString";
import { RootState } from "src/redux/actions";
import RequestServerTime from "src/request/RequestServerTime";
import { getUnixTimeLocaleString } from "src/utils/Time";
import DataTable from "../../components/util/DataTable/DataTable";
import HexString from "../../components/util/HexString/HexString";
import { TypeBadge } from "../../components/util/TypeBadge/TypeBadge";
import { RequestTotalTransactionCount, RequestTransactions } from "../../request";
import { TransactionTypes } from "../../utils/Transactions";
import "./Transactions.scss";

interface State {
    transactions: TransactionDoc[];
    totalTransactionCount?: number;
    isTransactionRequested: boolean;
    redirect: boolean;
    redirectPage?: number;
    redirectItemsPerPage?: number;
    redirectFilter: string[];
    showTypeFilter: boolean;
}

interface OwnProps {
    location: {
        search: string;
    };
}

interface StateProps {
    serverTimeOffset?: number;
}
type Props = OwnProps & StateProps;

class Transactions extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            transactions: [],
            totalTransactionCount: undefined,
            isTransactionRequested: false,
            redirect: false,
            redirectItemsPerPage: undefined,
            redirectPage: undefined,
            redirectFilter: [],
            showTypeFilter: false
        };
    }

    public componentWillReceiveProps(props: Props) {
        const {
            location: { search }
        } = this.props;
        const {
            location: { search: nextSearch }
        } = props;
        const typeFilter = new URLSearchParams(search).get("filter") !== undefined;
        if (nextSearch !== search) {
            this.setState({
                transactions: [],
                isTransactionRequested: false,
                redirect: false,
                redirectPage: undefined,
                redirectItemsPerPage: undefined,
                showTypeFilter: typeFilter
            });
        } else {
            this.setState({ showTypeFilter: typeFilter });
        }
    }

    public render() {
        const {
            location: { search },
            serverTimeOffset
        } = this.props;
        const params = new URLSearchParams(search);
        const currentPage = params.get("page") ? parseInt(params.get("page") as string, 10) : 1;
        const itemsPerPage = params.get("itemsPerPage") ? parseInt(params.get("itemsPerPage") as string, 10) : 25;
        const selectedTypes = params.get("filter") ? params.get("filter")!.split(",") : [];

        const {
            transactions,
            totalTransactionCount,
            isTransactionRequested,
            redirect,
            redirectItemsPerPage,
            redirectPage,
            redirectFilter,
            showTypeFilter
        } = this.state;

        if (redirect) {
            return (
                <Redirect
                    push={true}
                    to={`/txs?page=${redirectPage || currentPage}&itemsPerPage=${redirectItemsPerPage || itemsPerPage}${
                        selectedTypes || redirectFilter ? `&filter=${redirectFilter.sort().join(",")}` : ""
                    }`}
                />
            );
        }
        if (totalTransactionCount === undefined) {
            return (
                <RequestTotalTransactionCount
                    onTransactionTotalCount={this.onTransactionTotalCount}
                    onError={this.onError}
                />
            );
        }
        if (serverTimeOffset === undefined) {
            return <RequestServerTime />;
        }
        const maxPage = Math.floor(Math.max(0, totalTransactionCount - 1) / itemsPerPage) + 1;
        return (
            <Container className="transactions">
                {!isTransactionRequested ? (
                    <div>
                        <RequestTransactions
                            onTransactions={this.onTransactions}
                            page={currentPage}
                            itemsPerPage={itemsPerPage}
                            showProgressBar={false}
                            onError={this.onError}
                            selectedTypes={selectedTypes}
                        />
                        <RequestTotalTransactionCount
                            onTransactionTotalCount={this.onTransactionTotalCount}
                            onError={this.onError}
                            selectedTypes={selectedTypes}
                        />
                    </div>
                ) : null}
                <h1>Latest transactions</h1>
                {!showTypeFilter && (
                    <div className="show-type-filter-container">
                        <span className="filter-btn" onClick={this.showTypeFilter}>
                            Show type filter
                        </span>
                    </div>
                )}
                {showTypeFilter && (
                    <div className="type-filter-container">
                        <div className="filter-title">
                            <span>Type Filter</span>
                        </div>
                        <Row>
                            {TransactionTypes.map(type => {
                                return (
                                    <Col md={3} key={type}>
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={type}
                                                checked={_.includes(selectedTypes, type)}
                                                value={type}
                                                onChange={this.handleFilterChange}
                                                disabled={!isTransactionRequested}
                                            />
                                            <label className="form-check-label" htmlFor={`${type}`}>
                                                {capitalizeFirstLetter(type)}
                                            </label>
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>
                        <div className="hide-type-filter-container">
                            <span className="filter-btn" onClick={this.hideTypeFilter}>
                                Hide type filter
                            </span>
                        </div>
                    </div>
                )}

                <div className="d-flex align-items-end">
                    <div>
                        <div>
                            <div className="d-flex mt-small">
                                <div className="d-inline ml-auto pager">
                                    <ul className="list-inline">
                                        <li className="list-inline-item">
                                            <button
                                                disabled={currentPage === 1 || !isTransactionRequested}
                                                className={`btn btn-primary page-btn ${
                                                    currentPage === 1 || !isTransactionRequested ? "disabled" : ""
                                                }`}
                                                type="button"
                                                onClick={_.partial(this.moveFirst, currentPage)}
                                            >
                                                <FontAwesomeIcon icon={faAngleDoubleLeft} />
                                            </button>
                                        </li>
                                        <li className="list-inline-item">
                                            <button
                                                disabled={currentPage === 1 || !isTransactionRequested}
                                                className={`btn btn-primary page-btn ${
                                                    currentPage === 1 || !isTransactionRequested ? "disabled" : ""
                                                }`}
                                                type="button"
                                                onClick={_.partial(this.moveBefore, currentPage)}
                                            >
                                                <FontAwesomeIcon icon={faAngleLeft} /> Prev
                                            </button>
                                        </li>
                                        <li className="list-inline-item">
                                            <div className="number-view">
                                                {currentPage} of {maxPage}
                                            </div>
                                        </li>
                                        <li className="list-inline-item">
                                            <button
                                                disabled={currentPage === maxPage || !isTransactionRequested}
                                                className={`btn btn-primary page-btn ${
                                                    currentPage === maxPage || !isTransactionRequested ? "disabled" : ""
                                                }`}
                                                type="button"
                                                onClick={_.partial(this.moveNext, currentPage, maxPage)}
                                            >
                                                Next <FontAwesomeIcon icon={faAngleRight} />
                                            </button>
                                        </li>
                                        <li className="list-inline-item">
                                            <button
                                                disabled={currentPage === maxPage || !isTransactionRequested}
                                                className={`btn btn-primary page-btn ${
                                                    currentPage === maxPage || !isTransactionRequested ? "disabled" : ""
                                                }`}
                                                type="button"
                                                onClick={_.partial(this.moveLast, currentPage, maxPage)}
                                            >
                                                <FontAwesomeIcon icon={faAngleDoubleRight} />
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="ml-auto mb-3">
                        <span>Show </span>
                        <select onChange={this.handleOptionChange} defaultValue={itemsPerPage.toString()}>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="75">75</option>
                            <option value="100">100</option>
                        </select>
                        <span> entries</span>
                    </div>
                </div>
                <div className="transaction-table">
                    <div>
                        <div>
                            <DataTable>
                                <thead>
                                    <tr>
                                        <th style={{ width: "20%" }}>Type</th>
                                        <th style={{ width: "25%" }}>Hash</th>
                                        <th style={{ width: "15%" }} className="text-right">
                                            Fee
                                        </th>
                                        <th style={{ width: "25%" }}>Signer</th>
                                        <th style={{ width: "15%" }} className="text-right">
                                            Time
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!isTransactionRequested ? (
                                        <tr>
                                            <td colSpan={12}>
                                                <div className="text-center mt-12">
                                                    <FontAwesomeIcon
                                                        className="spin"
                                                        icon={faSpinner}
                                                        spin={true}
                                                        size={"2x"}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={12}>
                                                <div className="text-center mt-12">No transactions</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        _.map(transactions, transaction => {
                                            return (
                                                <tr key={`transaction-${transaction.hash}`}>
                                                    <td>
                                                        <TypeBadge transaction={transaction} />{" "}
                                                    </td>
                                                    <td scope="row">
                                                        <HexString
                                                            link={`/tx/0x${transaction.hash}`}
                                                            text={transaction.hash}
                                                        />
                                                    </td>
                                                    <td className="text-right">
                                                        <CommaNumberString text={transaction.fee} />
                                                        <span className="ccc">CCC</span>
                                                    </td>
                                                    <td>
                                                        <Link to={`/addr-platform/${transaction.signer}`}>
                                                            {transaction.signer}
                                                        </Link>
                                                    </td>
                                                    <td className="text-right">
                                                        {getUnixTimeLocaleString(
                                                            transaction.timestamp!,
                                                            serverTimeOffset
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </DataTable>
                        </div>
                    </div>
                </div>
            </Container>
        );
    }

    private showTypeFilter = () => {
        this.setState({ showTypeFilter: true });
    };

    private hideTypeFilter = () => {
        this.setState({ showTypeFilter: false });
    };

    private handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const {
            location: { search }
        } = this.props;
        const params = new URLSearchParams(search);
        const selectedTypes = params.get("filter") ? params.get("filter")!.split(",") : [];

        if (event.target.checked) {
            this.setState({
                redirectFilter: [...selectedTypes, event.target.value],
                isTransactionRequested: false,
                redirect: true,
                redirectPage: 1
            });
        } else {
            this.setState({
                redirectFilter: selectedTypes.filter(type => type !== event.target.value),
                isTransactionRequested: false,
                redirect: true,
                redirectPage: 1
            });
        }
    };

    private moveNext = (currentPage: number, maxPage: number, e: any) => {
        e.preventDefault();
        if (currentPage >= maxPage) {
            return;
        }
        this.setState({ redirectPage: currentPage + 1, redirect: true });
    };

    private moveLast = (currentPage: number, maxPage: number, e: any) => {
        e.preventDefault();
        if (currentPage >= maxPage) {
            return;
        }
        this.setState({ redirectPage: maxPage, redirect: true });
    };

    private moveBefore = (currentPage: number, e: any) => {
        e.preventDefault();
        if (currentPage <= 1) {
            return;
        }
        this.setState({ redirectPage: currentPage - 1, redirect: true });
    };

    private moveFirst = (currentPage: number, e: any) => {
        if (currentPage <= 1) {
            return;
        }
        this.setState({ redirectPage: 1, redirect: true });
    };

    private handleOptionChange = (event: any) => {
        const selected = parseInt(event.target.value, 10);
        this.setState({
            redirectItemsPerPage: selected,
            redirect: true,
            redirectPage: 1
        });
    };

    private onTransactionTotalCount = (totalTransactionCount: number) => {
        this.setState({ totalTransactionCount });
    };

    private onTransactions = (transactions: TransactionDoc[]) => {
        this.setState({ transactions, isTransactionRequested: true });
    };

    private onError = (error: any) => {
        console.log(error);
    };
}

export default connect((state: RootState) => {
    return {
        serverTimeOffset: state.appReducer.serverTimeOffset
    };
})(Transactions);

function capitalizeFirstLetter(str: string) {
    return str[0].toUpperCase() + str.slice(1);
}
