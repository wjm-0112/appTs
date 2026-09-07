import { useEffect, useMemo, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import type { AppRecord } from '../types';
import { INDUSTRIES } from '../constants/industries';
import { snapshotTemplates } from '../store/derive';
import { useApp } from '../store/AppContext';
import { PKG_RE } from '../constants/validate';

export interface AppFormValues {
  name: string;
  packageName: string;
  industryId: string;
  entityName?: string;
}

interface Props {
  open: boolean;
  /** edit 模式传入目标 App */
  editing?: AppRecord | null;
  /** 用于包名唯一性校验（排除自身） */
  existingPackages: string[];
  onCancel: () => void;
  onSubmit: (values: AppFormValues) => void;
}

export default function AppCreateModal({ open, editing, existingPackages, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<AppFormValues>();
  const isEdit = !!editing;
  const { profile } = useApp();
  const defaultIndustry = profile.defaults.industryId || 'tool';
  const [industryId, setIndustryId] = useState(defaultIndustry);

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          name: editing.name,
          packageName: editing.packageName,
          industryId: editing.industryId,
          entityName: editing.entity.name
        });
        setIndustryId(editing.industryId);
      } else {
        form.resetFields();
        form.setFieldsValue({
          industryId: defaultIndustry,
          entityName: profile.entity.name ?? undefined
        });
        setIndustryId(defaultIndustry);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, form]);

  const otherPackages = useMemo(() => {
    const set = new Set(existingPackages);
    if (editing) set.delete(editing.packageName);
    return [...set];
  }, [existingPackages, editing]);

  const industryWatch = Form.useWatch('industryId', form);
  const currentIndustryId = industryWatch ?? industryId;

  const preview = useMemo(() => {
    if (!isEdit) {
      const t = snapshotTemplates(currentIndustryId);
      return { material: t.materials.length, checklist: t.checklist.length };
    }
    return { material: editing?.materials.length ?? 0, checklist: editing?.checklist.length ?? 0 };
  }, [currentIndustryId, isEdit, editing]);

  return (
    <Modal
      title={isEdit ? '编辑 App 信息' : '新建 App'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.validateFields().then((v) => onSubmit(v))}
      okText={isEdit ? '保存' : '创建并进入详情'}
      cancelText="取消"
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 8 }}>
        <Form.Item
          name="name"
          label="App 名称"
          rules={[
            { required: true, message: '请输入 App 名称' },
            { max: 30, message: '名称不超过 30 字' }
          ]}
        >
          <Input placeholder="与软著 / 备案名称保持一致" allowClear />
        </Form.Item>
        <Form.Item
          name="packageName"
          label="包名（Package Name）"
          extra="创建后仍可修改，但注意与备案、各市场在架信息保持一致"
          rules={[
            { required: true, message: '请输入包名' },
            { pattern: PKG_RE, message: '包名需形如 com.example.app' },
            {
              validator: (_, val: string) =>
                val && otherPackages.includes(val.trim())
                  ? Promise.reject(new Error('该包名已被其它 App 使用'))
                  : Promise.resolve()
            }
          ]}
        >
          <Input placeholder="com.example.app" allowClear />
        </Form.Item>
        <Form.Item name="industryId" label="业务品类">
          <Select
            options={INDUSTRIES.map((i) => ({ value: i.id, label: i.name }))}
            onChange={(v) => setIndustryId(v)}
          />
        </Form.Item>
        {!isEdit && (
          <div
            style={{
              background: 'var(--brand-soft, #E7F0FD)',
              color: '#2057C9',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              marginBottom: 16
            }}
          >
            {profile.entity.name
              ? `已按主体档案带出主体「${profile.entity.name}」（可修改），`
              : ''}
            创建后将生成 材料 {preview.material} 项 + 自查 {preview.checklist} 项模板
            {profile.defaults.testAccount ? `，并预填默认测试账号与隐私政策链接` : ''}。
          </div>
        )}
        <Form.Item name="entityName" label="所属主体（选填）">
          <Input placeholder="营业执照主体名称" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
}
