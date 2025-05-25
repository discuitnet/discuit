import PropTypes from 'prop-types';
import React from 'react';
import MarkdownBody from '../../components/MarkdownBody';
import { CommunityRule } from '../../serverTypes';

export const RulesItems = ({
  rules,
  unordered = false,
}: {
  rules: CommunityRule[];
  unordered?: boolean;
}) => {
  let orules = rules;
  if (unordered) {
    orules = [...rules];
    orules.sort((a, b) => a.id - b.id);
  }

  const renderText = (markdown?: string | null) => {
    return <MarkdownBody veryBasic>{markdown}</MarkdownBody>;
  };

  return (
    <>
      {orules.map((rule, i) => (
        <React.Fragment key={rule.id}>
          <div>{i + 1}.</div>
          <div>{renderText(rule.rule)}</div>
          <div></div>
          <div>{renderText(rule.description)}</div>
        </React.Fragment>
      ))}
    </>
  );
};

RulesItems.propTypes = {
  rules: PropTypes.arrayOf(PropTypes.object).isRequired,
  unordered: PropTypes.bool,
};

const Rules = ({ rules, unordered = false }: { rules: CommunityRule[]; unordered?: boolean }) => {
  if (!rules) {
    return null;
  }

  return (
    <div className="card card-sub card-rules">
      <div className="card-head">
        <div className="card-title">Community rules</div>
      </div>
      <div className="card-content">
        <div className="card-rules-rules">
          <RulesItems rules={rules} unordered={unordered} />
        </div>
      </div>
    </div>
  );
};

export default Rules;
