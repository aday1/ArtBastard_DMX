import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { useStore } from '../../store';
import useStoreUtils from '../../store/storeUtils';
import { useTheme } from '../../context/ThemeContext';
import { FixtureVisualizer3D } from './FixtureVisualizer3D';
import styles from './FixtureSetup.module.scss';
const channelTypes = [
    { value: 'dimmer', label: 'Dimmer/Intensity' },
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'pan', label: 'Pan' },
    { value: 'tilt', label: 'Tilt' },
    { value: 'gobo', label: 'Gobo' },
    { value: 'other', label: 'Other' }
];
export const FixtureSetup = () => {
    const { theme } = useTheme();
    const fixtures = useStore(state => state.fixtures);
    const groups = useStore(state => state.groups);
    const [showCreateFixture, setShowCreateFixture] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [fixtureForm, setFixtureForm] = useState({
        name: '',
        startAddress: 1,
        channels: [{ name: 'Intensity', type: 'dimmer' }]
    });
    const [groupForm, setGroupForm] = useState({
        name: '',
        fixtureIndices: []
    });
    // Handle fixture form changes
    const handleFixtureChange = (key, value) => {
        setFixtureForm(prev => ({ ...prev, [key]: value }));
    };
    // Handle channel changes
    const handleChannelChange = (index, key, value) => {
        const updatedChannels = [...fixtureForm.channels];
        updatedChannels[index] = { ...updatedChannels[index], [key]: value };
        setFixtureForm(prev => ({ ...prev, channels: updatedChannels }));
    };
    // Add a new channel to the fixture
    const addChannel = () => {
        setFixtureForm(prev => ({
            ...prev,
            channels: [...prev.channels, { name: `Channel ${prev.channels.length + 1}`, type: 'other' }]
        }));
    };
    // Remove a channel from the fixture
    const removeChannel = (index) => {
        setFixtureForm(prev => ({
            ...prev,
            channels: prev.channels.filter((_, i) => i !== index)
        }));
    };
    // Save fixture to store
    const saveFixture = () => {
        const newFixture = {
            name: fixtureForm.name,
            startAddress: fixtureForm.startAddress,
            channels: fixtureForm.channels
        };
        useStoreUtils.setState(state => ({
            fixtures: [...state.fixtures, newFixture]
        }));
        // Reset form and hide it
        setFixtureForm({
            name: '',
            startAddress: fixtures.length > 0
                ? Math.max(...fixtures.map(f => f.startAddress + f.channels.length)) + 1
                : 1,
            channels: [{ name: 'Intensity', type: 'dimmer' }]
        });
        setShowCreateFixture(false);
        // Show success message
        useStoreUtils.getState().showStatusMessage(`Fixture "${newFixture.name}" created`, 'success');
    };
    // Toggle fixture selection for group
    const toggleFixtureForGroup = (index) => {
        setGroupForm(prev => {
            const isSelected = prev.fixtureIndices.includes(index);
            return {
                ...prev,
                fixtureIndices: isSelected
                    ? prev.fixtureIndices.filter(i => i !== index)
                    : [...prev.fixtureIndices, index]
            };
        });
    };
    // Save group to store
    const saveGroup = () => {
        const newGroup = {
            name: groupForm.name,
            fixtureIndices: [...groupForm.fixtureIndices]
        };
        useStoreUtils.setState(state => ({
            groups: [...state.groups, newGroup]
        }));
        // Reset form and hide it
        setGroupForm({
            name: '',
            fixtureIndices: []
        });
        setShowCreateGroup(false);
        // Show success message
        useStoreUtils.getState().showStatusMessage(`Group "${newGroup.name}" created`, 'success');
    };
    return (_jsxs("div", { className: styles.fixtureSetup, children: [_jsxs("h2", { className: styles.sectionTitle, children: [theme === 'artsnob' && 'Fixture Composition: The Architecture of Light', theme === 'standard' && 'Fixture Setup', theme === 'minimal' && 'Fixtures'] }), _jsx(FixtureVisualizer3D, {}), _jsxs("div", { className: styles.setupGrid, children: [_jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Existing Fixtures: The Gallery of Light Instruments', theme === 'standard' && 'Fixtures', theme === 'minimal' && 'Fixtures'] }) }), _jsxs("div", { className: styles.cardBody, children: [fixtures.length === 0 ? (_jsxs("div", { className: styles.emptyState, children: [_jsx("i", { className: "fas fa-lightbulb" }), _jsx("p", { children: "No fixtures have been created yet" })] })) : (_jsx("div", { className: styles.fixtureList, children: fixtures.map((fixture, index) => (_jsxs("div", { className: styles.fixtureItem, children: [_jsxs("div", { className: styles.fixtureHeader, children: [_jsx("h4", { children: fixture.name }), _jsxs("span", { className: styles.fixtureDmx, children: ["DMX: ", fixture.startAddress, "-", fixture.startAddress + fixture.channels.length - 1] })] }), _jsx("div", { className: styles.fixtureChannels, children: fixture.channels.map((channel, chIndex) => (_jsx("div", { className: styles.channelTag, children: _jsx("span", { className: `${styles.channelType} ${styles[channel.type]}`, children: channel.name }) }, chIndex))) })] }, index))) })), showCreateFixture ? (_jsxs("div", { className: styles.fixtureForm, children: [_jsxs("h4", { children: [theme === 'artsnob' && 'Create New Fixture: Birth of a Light Vessel', theme === 'standard' && 'New Fixture', theme === 'minimal' && 'New Fixture'] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "fixtureName", children: "Name:" }), _jsx("input", { type: "text", id: "fixtureName", value: fixtureForm.name, onChange: (e) => handleFixtureChange('name', e.target.value), placeholder: "Enter fixture name" })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "fixtureStartAddress", children: "Start Address:" }), _jsx("input", { type: "number", id: "fixtureStartAddress", value: fixtureForm.startAddress, onChange: (e) => handleFixtureChange('startAddress', parseInt(e.target.value) || 1), min: "1", max: "512" })] }), _jsxs("h5", { children: [theme === 'artsnob' && 'Channels: The Dimensions of Control', theme === 'standard' && 'Channels', theme === 'minimal' && 'Channels'] }), _jsx("div", { className: styles.channelsList, children: fixtureForm.channels.map((channel, index) => (_jsx("div", { className: styles.channelForm, children: _jsxs("div", { className: styles.channelFormRow, children: [_jsx("input", { type: "text", value: channel.name, onChange: (e) => handleChannelChange(index, 'name', e.target.value), placeholder: "Channel name" }), _jsx("select", { value: channel.type, onChange: (e) => handleChannelChange(index, 'type', e.target.value), children: channelTypes.map(type => (_jsx("option", { value: type.value, children: type.label }, type.value))) }), _jsx("button", { className: styles.removeButton, onClick: () => removeChannel(index), disabled: fixtureForm.channels.length === 1, title: "Remove channel", children: _jsx("i", { className: "fas fa-times" }) })] }) }, index))) }), _jsxs("div", { className: styles.formActions, children: [_jsxs("button", { className: styles.addChannelButton, onClick: addChannel, children: [_jsx("i", { className: "fas fa-plus" }), " Add Channel"] }), _jsxs("div", { className: styles.saveActions, children: [_jsx("button", { className: styles.cancelButton, onClick: () => setShowCreateFixture(false), children: "Cancel" }), _jsxs("button", { className: styles.saveButton, onClick: saveFixture, disabled: !fixtureForm.name || fixtureForm.channels.length === 0, children: [_jsx("i", { className: "fas fa-save" }), theme === 'artsnob' && 'Immortalize Fixture', theme === 'standard' && 'Save Fixture', theme === 'minimal' && 'Save'] })] })] })] })) : (_jsxs("button", { className: styles.createButton, onClick: () => {
                                            setShowCreateFixture(true);
                                            // Set next available DMX address
                                            if (fixtures.length > 0) {
                                                const lastFixture = fixtures[fixtures.length - 1];
                                                const nextAddress = lastFixture.startAddress + lastFixture.channels.length;
                                                setFixtureForm(prev => ({ ...prev, startAddress: nextAddress }));
                                            }
                                        }, children: [_jsx("i", { className: "fas fa-plus" }), theme === 'artsnob' && 'Create New Fixture', theme === 'standard' && 'Add Fixture', theme === 'minimal' && 'Add'] }))] })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Fixture Groups: The Constellations of Light', theme === 'standard' && 'Groups', theme === 'minimal' && 'Groups'] }) }), _jsxs("div", { className: styles.cardBody, children: [groups.length === 0 ? (_jsxs("div", { className: styles.emptyState, children: [_jsx("i", { className: "fas fa-object-group" }), _jsx("p", { children: "No groups have been created yet" })] })) : (_jsx("div", { className: styles.groupList, children: groups.map((group, index) => (_jsxs("div", { className: styles.groupItem, children: [_jsxs("div", { className: styles.groupHeader, children: [_jsx("h4", { children: group.name }), _jsxs("span", { className: styles.groupCount, children: [group.fixtureIndices.length, " fixture", group.fixtureIndices.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: styles.groupFixtures, children: group.fixtureIndices.map(fixtureIndex => (_jsx("div", { className: styles.groupFixtureTag, children: fixtures[fixtureIndex]?.name || `Fixture #${fixtureIndex}` }, fixtureIndex))) })] }, index))) })), showCreateGroup ? (_jsxs("div", { className: styles.groupForm, children: [_jsxs("h4", { children: [theme === 'artsnob' && 'Create Fixture Group: The Collective Expression', theme === 'standard' && 'New Group', theme === 'minimal' && 'New Group'] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "groupName", children: "Name:" }), _jsx("input", { type: "text", id: "groupName", value: groupForm.name, onChange: (e) => setGroupForm(prev => ({ ...prev, name: e.target.value })), placeholder: "Enter group name" })] }), _jsxs("h5", { children: [theme === 'artsnob' && 'Select Fixtures: Choose Your Instruments', theme === 'standard' && 'Select Fixtures', theme === 'minimal' && 'Fixtures'] }), fixtures.length === 0 ? (_jsx("p", { className: styles.noFixturesMessage, children: "No fixtures available to add to group" })) : (_jsx("div", { className: styles.fixtureSelection, children: fixtures.map((fixture, index) => (_jsxs("div", { className: `${styles.selectableFixture} ${groupForm.fixtureIndices.includes(index) ? styles.selected : ''}`, onClick: () => toggleFixtureForGroup(index), children: [_jsx("div", { className: styles.fixtureCheckbox, children: _jsx("input", { type: "checkbox", checked: groupForm.fixtureIndices.includes(index), onChange: () => { }, onClick: (e) => e.stopPropagation() }) }), _jsxs("div", { className: styles.fixtureInfo, children: [_jsx("span", { className: styles.fixtureName, children: fixture.name }), _jsxs("span", { className: styles.fixtureDmx, children: ["DMX: ", fixture.startAddress, "-", fixture.startAddress + fixture.channels.length - 1] })] })] }, index))) })), _jsxs("div", { className: styles.formActions, children: [_jsx("button", { className: styles.cancelButton, onClick: () => setShowCreateGroup(false), children: "Cancel" }), _jsxs("button", { className: styles.saveButton, onClick: saveGroup, disabled: !groupForm.name || groupForm.fixtureIndices.length === 0, children: [_jsx("i", { className: "fas fa-save" }), theme === 'artsnob' && 'Establish Collective', theme === 'standard' && 'Save Group', theme === 'minimal' && 'Save'] })] })] })) : (_jsxs("button", { className: styles.createButton, onClick: () => setShowCreateGroup(true), disabled: fixtures.length === 0, children: [_jsx("i", { className: "fas fa-plus" }), theme === 'artsnob' && 'Create Fixture Group', theme === 'standard' && 'Add Group', theme === 'minimal' && 'Add'] }))] })] })] })] }));
};
