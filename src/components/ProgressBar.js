import React from 'react'


class ProgressBar extends React.PureComponent {
  render() {
    return (
      <div className='bg-gray-100 w-full h-6' style={{borderRadius: '50px'}}>
        <div className='h-full bg-alert-blue transition-all' style={{borderRadius: '50px', width: this.props.progress + '%'}} />
      </div>
    )
  }
}

export default ProgressBar
