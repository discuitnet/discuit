import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ButtonClose } from '../../components/Button';
import DashboardPage from '../../components/Dashboard/DashboardPage';
import { FormField } from '../../components/Form';
import { InputWithCount, useInputMaxLength } from '../../components/Input';
import Modal from '../../components/Modal';
import { mfetchjson } from '../../helper';
import { useLoading } from '../../hooks';
import { Community, CommunityRule } from '../../serverTypes';
import { snackAlertError } from '../../slices/mainSlice';

const Rules = ({ community }: { community: Community }) => {
  const dispatch = useDispatch();
  const [rules, _setRules] = useState<CommunityRule[]>([]);
  const setRules = (rules: CommunityRule[]) => {
    _setRules(rules.sort((a, b) => a.zIndex - b.zIndex));
  };

  const [isEditRule, setIsEditRule] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [loading, setLoading] = useLoading();
  useEffect(() => {
    (async () => {
      try {
        const rrules = await mfetchjson(`/api/communities/${community.id}/rules`);
        setRules(rrules);
        setLoading('loaded');
      } catch (error) {
        dispatch(snackAlertError(error));
        setLoading('error');
      }
    })();
  }, [community.id, dispatch, setLoading]);

  const ruleMaxLength = 512;
  const [rule, setRule] = useInputMaxLength(ruleMaxLength);
  const descriptionMaxLength = 512;
  const [description, setDescription] = useInputMaxLength(descriptionMaxLength);

  const handleEditClose = () => {
    setEditOpen(false);
    setRule('');
    setDescription('');
  };

  const handleAddRule = () => {
    setIsEditRule(false);
    setEditOpen(true);
  };

  const [ruleEditing, setRuleEditing] = useState<CommunityRule | null>(null);
  const handleEditRule = (rule: CommunityRule) => {
    setRuleEditing(rule);
    setIsEditRule(true);
    setRule(rule.rule);
    setDescription(rule.description || '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isEditRule) {
        if (!ruleEditing) return;
        const rrule = await mfetchjson(`/api/communities/${community.id}/rules/${ruleEditing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ zIndex: ruleEditing.zIndex, rule, description }),
        });
        const nrules = [...rules.filter((r) => r.id !== rrule.id), rrule];
        setRules(nrules);
      } else {
        const rrules = await mfetchjson(`/api/communities/${community.id}/rules`, {
          method: 'POST',
          body: JSON.stringify({
            rule,
            description,
          }),
        });
        setRules(rrules);
      }
      handleEditClose();
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

  const handleDeleteRule = async (rule: CommunityRule) => {
    if (confirm('Are you certain?')) {
      try {
        await mfetchjson(`/api/communities/${community.id}/rules/${rule.id}`, {
          method: 'DELETE',
        });
        setRules(rules.filter((r) => r.id !== rule.id));
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    }
  };

  if (loading !== 'loaded') {
    return null;
  }

  const modalTitle = isEditRule ? 'Edit rule' : 'Add rule';
  const modalDisabled = rule === '';

  return (
    <DashboardPage className="modtools-content modtools-rules" title="Rules" fullWidth>
      <Modal open={editOpen} onClose={handleEditClose}>
        <div className="modal-card">
          <div className="modal-card-head">
            <div className="modal-card-title">{modalTitle}</div>
            <ButtonClose onClick={handleEditClose} />
          </div>
          <form
            className="modal-card-content"
            onSubmit={(e) => {
              e.preventDefault();
              if (!modalDisabled) handleSave();
            }}
          >
            <FormField label="Rule">
              <InputWithCount maxLength={ruleMaxLength} value={rule} onChange={setRule} autoFocus />
            </FormField>
            <FormField label="Description">
              <InputWithCount
                textarea
                rows={5}
                maxLength={descriptionMaxLength}
                value={description}
                onChange={setDescription}
                style={{ resize: 'vertical' }}
              />
            </FormField>
          </form>
          <div className="modal-card-actions">
            <button className="button-main" disabled={modalDisabled} onClick={handleSave}>
              Save
            </button>
            <button onClick={handleEditClose}>Cancel</button>
          </div>
        </div>
      </Modal>
      <div className="modtools-rules-new-rule">
        <button className="button-main" onClick={handleAddRule}>
          Add rule
        </button>
      </div>
      <div className="modtools-rules-list">
        <div className="table">
          {rules.map((rule) => (
            <div className="table-row" key={rule.id}>
              <div className="table column">{rule.zIndex}</div>
              <div className="table-column">{rule.rule}</div>
              <div className="table-column">{rule.description}</div>
              <div className="table-column" style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="button-red" onClick={() => handleDeleteRule(rule)}>
                  Delete
                </button>
              </div>
              <div className="table-column">
                <button onClick={() => handleEditRule(rule)}>Edit</button>
              </div>
            </div>
          ))}
          {/*
          <div className="table-row">
            <div className="table-column">1</div>
            <div className="table-column">No Spam</div>
            <div className="table-column">{"Don't add any spam..."}</div>
            <div className="table-column">
              <button onClick={() => setEditOpen(true)}>Edit</button>
            </div>
          </div>
          <div className="table-row">
            <div className="table-column">1</div>
            <div className="table-column">No self promotion</div>
            <div className="table-column">{"Just don't do it..."}</div>
            <div className="table-column">
              <button onClick={() => setEditOpen(true)}>Edit</button>
            </div>
          </div>
          */}
        </div>
      </div>
    </DashboardPage>
  );
};

export default Rules;
